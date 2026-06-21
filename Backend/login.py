import hashlib
import json
import os
import uuid
from decimal import Decimal

import boto3


dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
tabla_usuarios = dynamodb.Table(os.environ.get("TABLE_USUARIOS", "dev-usuarios"))
tabla_sesiones = dynamodb.Table(os.environ.get("TABLE_SESIONES", "dev-sesiones"))


def hashear_password(password, salt):
    return hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000
    ).hex()


def lambda_handler(event, context):
    try:
        body = json.loads(event["body"])
        email = body.get("email", "").strip().lower()
        password = body.get("password", "")

        if not email or not password:
            return respuesta(400, {"error": "Email y password son requeridos"})

        usuario = tabla_usuarios.get_item(Key={"email": email}).get("Item")
        if not usuario:
            return respuesta(401, {"error": "Credenciales inválidas"})

        hash_calculado = hashear_password(password, usuario["salt"])
        if hash_calculado != usuario["password_hash"]:
            return respuesta(401, {"error": "Credenciales inválidas"})

        token = str(uuid.uuid4())
        tabla_sesiones.put_item(Item={"token": token, "email": email})
        return respuesta(
            200,
            {
                "token": token,
                "email": email,
                "nombre": usuario.get("nombre", ""),
                "perfil": usuario.get("perfil"),
            },
        )
    except Exception as error:
        print(f"Error en login: {error}")
        return respuesta(500, {"error": "Error interno del servidor"})


def respuesta(status, body):
    return {
        "statusCode": status,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json",
        },
        "body": json.dumps(body, default=serializar),
    }


def serializar(valor):
    if not isinstance(perfil, str) or not perfil.strip():
        return respuesta(400, {"error": "perfil debe ser un texto"})
    raise TypeError(f"No se puede serializar {type(valor).__name__}")