import hashlib
import json
import os
import re
from decimal import Decimal
import boto3

dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
tabla_usuarios = dynamodb.Table(os.environ.get("TABLE_USUARIOS", "dev-usuarios"))
tabla_sesiones = dynamodb.Table(os.environ.get("TABLE_SESIONES", "dev-sesiones"))

def hashear_password(password, salt=None):
    if salt is None:
        salt = os.urandom(16).hex()
    hash_resultado = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000
    ).hex()
    return hash_resultado, salt

def email_valido(email):
    patron = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
    return re.match(patron, email) is not None

def usuario_de_token(event):
    headers = event.get("headers", {}) or {}
    auth_header = headers.get("authorization") or headers.get("Authorization", "")
    token = auth_header.replace("Bearer ", "").strip()
    if not token:
        return None
    sesion = tabla_sesiones.get_item(Key={"token": token}).get("Item")
    return sesion.get("email") if sesion else None

def es_actualizacion_perfil(event):
    metodo = event.get("httpMethod") or event.get("requestContext", {}).get("http", {}).get("method")
    return metodo == "PUT"

def actualizar_perfil(event, body):
    email = usuario_de_token(event)
    if not email:
        return respuesta(401, {"error": "Sesión inválida"})

    perfil = body.get("perfil")
    if not isinstance(perfil, str) or not perfil.strip():
        return respuesta(400, {"error": "perfil debe ser un texto"})

    tabla_usuarios.update_item(
        Key={"email": email},
        UpdateExpression="SET perfil = :perfil",
        ExpressionAttributeValues={":perfil": perfil},
    )
    return respuesta(200, {"mensaje": "Perfil guardado correctamente", "perfil": perfil})

def lambda_handler(event, context):
    try:
        body = json.loads(event["body"])
        if es_actualizacion_perfil(event):
            return actualizar_perfil(event, body)

        email = body.get("email", "").strip().lower()
        password = body.get("password", "")
        nombre = body.get("nombre", "")

        if not email or not password:
            return respuesta(400, {"error": "Email y password son requeridos"})
        if not email_valido(email):
            return respuesta(400, {"error": "Email inválido"})
        if len(password) < 8:
            return respuesta(400, {"error": "La contraseña debe tener al menos 8 caracteres"})

        existente = tabla_usuarios.get_item(Key={"email": email})
        if "Item" in existente:
            return respuesta(409, {"error": "Ya existe un usuario con ese email"})

        password_hash, salt = hashear_password(password)
        tabla_usuarios.put_item(
            Item={
                "email": email,
                "nombre": nombre,
                "password_hash": password_hash,
                "salt": salt,
            }
        )
        return respuesta(201, {"mensaje": "Usuario registrado correctamente", "email": email})
    except Exception as error:
        print(f"Error en registro: {error}")
        return respuesta(500, {"error": "Error interno del servidor"})

def respuesta(status, body):
    return {
        "statusCode": status,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json",
        },
        "body": json.dumps(body),
    }