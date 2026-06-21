import json
import boto3
from boto3.dynamodb.conditions import Key

dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
tabla = dynamodb.Table('dev-resultados_ofertas')

def lambda_handler(event, context):
    sesion_id = event['queryStringParameters']['sesion_id']

    respuesta = tabla.query(
        KeyConditionExpression=Key('sesion_id').eq(sesion_id)
    )

    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({
            'resultados': respuesta['Items'],
            'total': respuesta['Count']
        })
    }