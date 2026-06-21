import json
import boto3
import os

dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
tabla_sesiones = dynamodb.Table(os.environ.get('TABLE_SESIONES', 'dev-sesiones'))

def lambda_handler(event, context):
    headers = event.get('headers', {})
    auth_header = headers.get('authorization') or headers.get('Authorization', '')
    token = auth_header.replace('Bearer ', '').strip()

    if not token:
        return respuesta(401, {'error': 'Token no proporcionado'})

    sesion = tabla_sesiones.get_item(Key={'token': token}).get('Item')

    if not sesion:
        return respuesta(401, {'error': 'Sesión inválida'})

    return respuesta(200, {'email': sesion['email'], 'valido': True})

def respuesta(status, body):
    return {
        'statusCode': status,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
        },
        'body': json.dumps(body)
    }