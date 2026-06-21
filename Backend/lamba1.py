import json
import boto3
import csv
import io
import uuid
import os

sqs = boto3.client('sqs', region_name='us-east-1')
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
tabla_sesiones = dynamodb.Table(os.environ.get('TABLE_SESIONES', 'dev-sesiones'))
tabla_usuarios = dynamodb.Table(os.environ.get('TABLE_USUARIOS', 'dev-usuarios'))  

SQS_URL = os.environ['SQS_URL']

def validar_token(event):
    headers = event.get('headers', {}) or {}
    auth_header = headers.get('authorization') or headers.get('Authorization', '')
    token = auth_header.replace('Bearer ', '').strip()

    if not token:
        return None

    sesion = tabla_sesiones.get_item(Key={'token': token}).get('Item')
    if not sesion:
        return None

    return sesion['email']

def lambda_handler(event, context):
    email_usuario = validar_token(event)
    if not email_usuario:
        return respuesta(401, {'error': 'No autorizado. Inicia sesion para continuar.'})

    body = json.loads(event['body'])
    csv_content = body.get('csv')

    if not csv_content:
        return respuesta(400, {'error': 'El campo csv es requerido.'})

    perfil_usuario = body.get('perfil')
    if not perfil_usuario:
        usuario = tabla_usuarios.get_item(Key={'email': email_usuario}).get('Item', {})
        perfil_usuario = usuario.get('perfil', '')

    if not perfil_usuario:
        return respuesta(400, {'error': 'No tienes perfil guardado. Agrégalo antes de procesar ofertas.'})

    sesion_id = str(uuid.uuid4())
    reader = csv.DictReader(io.StringIO(csv_content))
    ofertas = list(reader)

    if not ofertas:
        return respuesta(400, {'error': 'El CSV no contiene ofertas.'})

    for i, oferta in enumerate(ofertas):
        mensaje = {
            'sesion_id': sesion_id,
            'oferta_id': str(i),
            'empresa': oferta.get('empresa', ''),
            'cargo': oferta.get('cargo', ''),
            'modalidad': oferta.get('modalidad', ''),
            'lugar': oferta.get('lugar', ''),
            'salario': oferta.get('salario', ''),
            'horas_semanales': oferta.get('horas_semanales', ''),
            'requerimientos': oferta.get('requerimientos', ''),
            'descripcion': oferta.get('descripcion', ''),
            'perfil_usuario': perfil_usuario,
            'usuario_email': email_usuario
        }
        sqs.send_message(
            QueueUrl=SQS_URL,
            MessageBody=json.dumps(mensaje)
        )

    return respuesta(200, {
        'sesion_id': sesion_id,
        'total': len(ofertas)
    })

def respuesta(status, body):
    return {
        'statusCode': status,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps(body)
    }