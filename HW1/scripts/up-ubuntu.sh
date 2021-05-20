#!/bin/bash

# Create VM, with bridged networking enabled.
bakerx run ubuntu-vm focal -b

# Add port forward
VBoxManage controlvm ubuntu-vm natpf1 nodeport,tcp,,8089,,9000

# Get ssh command
ssh_cmd=$(bakerx ssh-info ubuntu-vm|tr -d '"')

# Use heredoc to send script over ssh
$ssh_cmd << 'END_DOC'

# Install packages
curl -sL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo apt-get install git
# Get projects
git clone https://github.com/CSC-DevOps/App
# Setup project
cd App
npm install
# Run node js program
node main.js start 9000

exit
END_DOC

echo $ssh_cmd