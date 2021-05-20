import boto3
from botocore.config import Config
import os, time

my_config = Config(region_name="us-east-1")

ec2 = boto3.client(
    "ec2",
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID_DEVOPS"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY_DEVOPS"),
    config=my_config,
)

aws_key_pair = os.path.basename(os.getenv("AWS_KEY_PAIR_DEVOPS")).split(".")[0]

create_response = ec2.run_instances(
    ImageId="ami-0f593aebffc0070e1",
    InstanceType="t2.micro",
    KeyName=aws_key_pair,
    MinCount=1,
    MaxCount=1,
)
instanceID = create_response["Instances"][0]["InstanceId"]
print("\nInstanceID for the new EC2 created :: " + instanceID)

time.sleep(5)

response = ec2.describe_instances(InstanceIds=[instanceID])
ipv4_address = response["Reservations"][0]["Instances"][0]["PublicIpAddress"]

print("Public IPv4 address :: " + ipv4_address + "\n")
