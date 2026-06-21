import boto3
import os
import json

sqs = boto3.client('sqs')

MAIN_QUEUE = os.environ.get('SQS_URL')
DLQ_URL = os.environ.get('DLQ_URL')

def handler(event, context):
    response = sqs.receive_message(
        QueueUrl=DLQ_URL,
        MaxNumberOfMessages=10
    )
    
    messages = response.get('Messages', [])
    
    if not messages:
        print("DLQ vacia, nada que reprocesar")
        return {
            'statusCode': 200,
            'body': json.dumps({'rescatados': 0})
        }
    
    rescatados = 0
    for msg in messages:
        sqs.send_message(
            QueueUrl=MAIN_QUEUE,
            MessageBody=msg['Body']
        )
        sqs.delete_message(
            QueueUrl=DLQ_URL,
            ReceiptHandle=msg['ReceiptHandle']
        )
        rescatados += 1
    
    print(f"Mensajes rescatados: {rescatados}")
    return {
        'statusCode': 200,
        'body': json.dumps({'rescatados': rescatados})
    }