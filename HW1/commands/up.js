const chalk = require('chalk');
const fs = require('fs');
const os = require('os');
const path = require('path');
const waitssh = require('waitssh');
const ipUtil = require('ip');

const VBoxManage = require('../lib/VBoxManage');
const ssh = require('../lib/ssh');

exports.command = 'up';
exports.desc = 'Provision and configure a new development environment';
exports.builder = yargs => {
    yargs.options({
        force: {
            alias: 'f',
            describe: 'Force the old VM to be deleted when provisioning',
            default: false,
            type: 'boolean'
        },
        extrareq1: {
            alias: 'er1',
            describe: 'Create a second NIC with host-only networking enabled and set the IP address to 192.168.33.10',
            default: false,
            type: 'boolean'
        }
    });
};
// add another option in yargs which specifies if the extra requirement 1 task is to performed while booting up the VM

exports.handler = async argv => {
    const { force, extrareq1 } = argv;

    (async () => {

        await up(force, extrareq1);
    })();

};

async function up(force, extrareq1) {
    // Use current working directory to derive name of virtual machine
    let cwd = process.cwd().replace(/[/]/g, "-").replace(/\\/g, "-");
    let name = `V`;
    console.log(chalk.keyword('pink')(`Bringing up machine ${name}`));

    // We will use the image we've pulled down with bakerx.
    let image = path.join(os.homedir(), '.bakerx', '.persist', 'images', 'focal', 'box.ovf');
    if (!fs.existsSync(image)) {
        console.log(chalk.red(`Could not find ${image}. Please download with 'bakerx pull ${image} cloud-images.ubuntu.com'.`))
    }

    // We check if we already started machine, or have a previous failed build.
    let state = await VBoxManage.show(name);
    console.log(`VM is currently: ${state}`);
    if (state == 'poweroff' || state == 'aborted' || force) {
        console.log(`Deleting powered off machine ${name}`);
        // Unlock

        await VBoxManage.execute("startvm", `${name} --type emergencystop`).catch(e => e);
        await VBoxManage.execute("controlvm", `${name} --poweroff`).catch(e => e);
        // We will delete powered off VMs, which are most likely incomplete builds.
        await VBoxManage.execute("unregistervm", `${name} --delete`);
    } else if (state == 'running') {
        console.log(`VM ${name} is running. Use 'V up --force' to build new machine.`);

        return;
    }

    // Import the VM using the box.ovf file and register it under new name.
    await VBoxManage.execute("import", `"${image}" --vsys 0 --vmname ${name}`);
    // Set memory size in bytes and number of virtual CPUs.
    await VBoxManage.execute("modifyvm", `"${name}" --memory 1024 --cpus 1`);
    // Disconnect serial port
    await VBoxManage.execute("modifyvm", `${name}  --uart1 0x3f8 4 --uartmode1 disconnected`);

    // Run your specific customizations for the Virtual Machine.
    await customize(name);

    let static_ip = "192.168.33.10";
    if (extrareq1) {
        // Extra requirement 1: Create a second NIC with host-only networking enabled. Create a network adapter if does not exist or reuse.
        await extraReq1AddAdapter(name, static_ip);
    }

    // Start the VM.
    // Unlock any session.
    await VBoxManage.execute("startvm", `${name} --type emergencystop`).catch(e => e);
    // Real start.
    await VBoxManage.execute("startvm", `${name} --type headless`);

    // Explicit wait for boot
    let sshInfo = { port: 2800, hostname: 'localhost' }
    try {
        console.log(`Waiting for ssh to be ready on ${sshInfo.hostname}:${sshInfo.port}...`);
        await waitssh(sshInfo);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
    console.log(`ssh is ready`);

    if (extrareq1) {
        // Extra requirement 1: Add a new network interface with a set static IP when the VM is running.
        await extraReq1AddIP(static_ip);
    }

    // Run your post-configuration customizations for the Virtual Machine.
    await postconfiguration(name);

}

async function customize(name) {
    console.log(chalk.keyword('pink')(`Running VM customizations...`));
    try {
        // 1. Add a NIC with NAT networking
        await VBoxManage.execute("modifyvm", `${name} --nic1 nat`).catch(e => e);
        // 2. Add a port forward from 2800 => 22 for guestssh
        await VBoxManage.execute("modifyvm", `${name} --natpf1 guestssh,tcp,,2800,,22`);
        // 3. Add a port forward from 9000 => 5001 for a node application
        await VBoxManage.execute("modifyvm", `${name} --natpf1 nodeport,tcp,,9000,,5001`);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

async function extraReq1AddAdapter(name, static_ip) {
	console.log(chalk.keyword('pink')(`Running VM customizations for Extra Requirement 1 - network adapter check...`));

    // ----------------------------------------------------------------------
    // define the static net mask to specify the subnet for the static IP, calculate the IP for the network gateway adapter
    let static_net_mask = "255.255.255.0";
    let networkAddress = ipUtil.mask(static_ip, static_net_mask);
    let gateway_ip = ipUtil.cidrSubnet(networkAddress + '/26').firstAddress;

    // console.log(`Gateway ip: ${gateway_ip}`);
    // let static_gateway = static_ip.substring(0, static_ip.lastIndexOf('.'));
    // console.log('------');
    // console.log(static_ip, static_gateway);


    // fetch the list of network adapters already created and parse the output so that we have a list of dictionary with key-pair values for network adapter parameters
    let adapterList = await VBoxManage.execute("list", "hostonlyifs");

    let hostonlyifs = [];
    adapterList.split(/\r?\n\r?\n/).forEach(adapters => {
        if (adapters.length > 0) {
            let adapter = {};
            adapters.split('\n').forEach(line => {
                if (line.length > 0) {
                    let splitIdx = line.indexOf(':');
                    adapter[line.substr(0, splitIdx).trim()] = line.substr(splitIdx + 1).trim();
                }
            })
            hostonlyifs.push(adapter);
        }
    })
    // console.log(hostonlyifs);

    let adapter_name = null;
    // let gateway_ip = null;

    // for every network adapter already created
    hostonlyifs.every(hdict => {
        let adapter_ip = hdict.IPAddress;

        // check if adapter IP address is the same as the gateway IP address we calculated, if yes we will reuse this network adapter in the VM
        if( adapter_ip === gateway_ip ) {
            adapter_name = hdict.Name;
            return false;
        }
        return true;

        /*
        let adapter_net_mask = hdict.NetworkMask;

        let networkAddress = ipUtil.mask(adapter_ip, adapter_net_mask);
        let adapter_gateway = networkAddress.substring(0, static_ip.lastIndexOf('.'));
        let adapter_ip_from_net = ipUtil.cidrSubnet(networkAddress + '/26').firstAddress;

        console.log(`\nNetwork addr: ${networkAddress} \nAdapter gateway: ${adapter_gateway}\nAdapter ip: ${adapter_ip_from_net}`);

        if (adapter_gateway === static_gateway) {
            adapter_name = hdict.Name;
            gateway_ip = adapter_ip_from_net;
            return false;
        }
        return true;
        */
    })

    // if we were not able to find a network adapter with the desired gateway IP address
    if (adapter_name === null) {
        // create a new network adapter and parse its name from the output of the "VBoxManage hostonlyifs create" command
        let stdout = await VBoxManage.execute("hostonlyif", "create");
        adapter_name = stdout.substr(stdout.indexOf(`'`) + 1, stdout.lastIndexOf(`'`) - stdout.indexOf(`'`) - 1);

        console.log("adapter created");
    } else {
        // use existing adapter
        console.log(`adapter exists`);
    }
    console.log(`\nAdapter Name: ${adapter_name}`);

    // link the existing or newly created network adapter with the VM and set its gateway IP to the value we desire
    await VBoxManage.execute("hostonlyif", `ipconfig ${adapter_name} --ip ${gateway_ip}`);
    await VBoxManage.execute("modifyvm", `${name} --nic2 hostonly --hostonlyadapter2 ${adapter_name}`);

    // await VBoxManage.execute("hostonlyif", `ipconfig vboxnet0 --ip "192.168.33.2"`);
    // await VBoxManage.execute("modifyvm", `${name} --nic2 hostonly --hostonlyadapter2 vboxnet0`);
}

async function extraReq1AddIP(ip) {
    console.log(chalk.keyword('pink')(`Running VM customizations for Extra Requirement 1 - Adding static IP...`));
    try {
        console.log(`new ip: ${ip}`);
        // create a new network interface by the name of enp0s8 and add the static IP that we want to set
        await ssh("sudo ip addr flush dev enp0s8");
        await ssh(`sudo ip addr add ${ip} dev enp0s8`);
        await ssh(`sudo ip link set enp0s8 up`);

        // define the gateway for the IP so that it is reachable from the host
        let gateway = ip.substring(0, ip.lastIndexOf('.'));
        await ssh(`sudo ip route add ${gateway}.0/24 dev enp0s8`);
        await ssh(`sudo ip route add ${ip} via ${gateway}.1`);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

async function postconfiguration(name) {
    console.log(chalk.keyword('pink')(`Running post-configurations...`));

    try {
        // await ssh("ls /");

        // 1. install nodejs, npm, git
        await ssh("sudo apt-get -y update");
        await ssh("sudo apt-get -y install nodejs npm");
        await ssh("sudo apt-get -y install git");

        // 2. Clone https://github.com/CSC-DevOps/App
        await ssh("git clone https://github.com/CSC-DevOps/App");

        // 3. Install the npm packages
        await ssh("'cd App/ && npm install'");

    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}
