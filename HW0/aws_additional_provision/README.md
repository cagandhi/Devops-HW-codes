# AWS additional cloud provider provisioning
**Name:** Chintan Gandhi <br>
**Unity ID:** cagandhi <br>
**Student ID:** 200315238

## Installation
1. Create a new virtual environment if needed.
2. Install the required packages with the command: `pip install -r requirements.txt`
3. Create a [user on AWS](https://console.aws.amazon.com/iam/home?region=us-east-1/users#/users). <br>
   1. `Programmatic access` option should be ticked.
   2. In `Set Permissions`, click `Attach existing policies directly` and select `AdministratorAccess` for the user.
   3. Move through the next steps and finally create the user.
   4. Copy the `Access Key ID` and `Secret Access Key` and store them as environment variables named: `AWS_ACCESS_KEY_ID_DEVOPS` and `AWS_SECRET_ACCESS_KEY_DEVOPS` respectively.
4. Create a [key pair on AWS](https://console.aws.amazon.com/ec2/v2/home?region=us-east-1#KeyPairs:). <br>
   1. Enter key pair name. Do not use periods anywhere in the key name for the sake of running this code.
   2. Select `pem` file format.
   3. Create the key pair.
   4. Store the complete path of the `key-pair.pem` file as an environment variable named `AWS_KEY_PAIR_DEVOPS`.

## Usage
1. You can change the `region_name` parameter in line 5. Make sure that the key pair is created in the region that you specify.
2. Replace the `KeyName` value in `line 17` with the one that you specify.
3. Run the code: `python aws_ec2_provision.py`
