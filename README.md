# JobMatch AI 
### Hackathon UTEC — Cloud Computing 2026-1

**Integrantes:**
- Joaquin Andre Ocaña Aniya
- Benjamin Mario Augusto Suarez Arzapalo
- Valeria Valentina Ríos Gómez

---

## ¿Qué es JobMatch AI?

JobMatch AI es una plataforma que permite al candidato subir un archivo CSV con ofertas laborales. El sistema procesa cada oferta de forma **asíncrona** usando un modelo de lenguaje (LLM) a través de la **API de Groq** en el modelo openai/gpt-oss-20b, y devuelve un análisis personalizado de compatibilidad basado en el perfil del usuario.

---

## Arquitectura

El despliegue utiliza **Serverless Framework** para definir toda la infraestructura como código (IaC). El entorno de despliegue es una instancia EC2 creada a partir de la AMI pública `Cloud9Ubuntu22`.

El `serverless.yml` crea automáticamente:
- 7 funciones Lambda con sus triggers configurados
- 1 cola SQS principal para el procesamiento de ofertas
- 1 Dead Letter Queue (DLQ) para mensajes fallidos tras 3 intentos automáticos
- 3 tablas DynamoDB
- API Gateway con todos los endpoints HTTP
- Roles y permisos IAM necesarios

---

## Despliegue Paso a Paso

### 1. Configurar la instancia EC2

1. Ir al servicio **EC2** en AWS Console
2. En el menú lateral ir a **Imágenes → AMI**
3. Seleccionar **Imágenes públicas** y buscar `Cloud9Ubuntu22`
4. Elegir la versión más reciente y hacer clic en **Lanzar instancia a partir de una AMI**
5. En **Par de claves** seleccionar `vockey`
6. En **Configuración de red** habilitar:
   - Permitir tráfico SSH desde: `Cualquier lugar`
   - Permitir tráfico HTTP desde Internet: `Cualquier lugar`
7. Configurar **20 GB** de almacenamiento
8. Hacer clic en **Lanzar instancia**

---

### 2. Instalaciones y configuraciones

#### 2.1 Verificar Node.js, npm y AWS CLI

```bash
node -v        # debe ser v20 o superior
npm -v
aws --version
```

> ⚠️ Si Node.js no está instalado o es menor a v20, ejecutar:
> ```bash
> curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
> sudo apt-get install -y nodejs
> ```

#### 2.2 Instalar Serverless Framework

```bash
sudo npm install -g serverless
serverless --version
```

#### 2.3 Configurar credenciales de AWS

```bash
mkdir ~/.aws
cd ~/.aws
nano credentials
```

Pegar el contenido de las credenciales de acceso a AWS con el siguiente formato:

```
[default]
aws_access_key_id = TU_ACCESS_KEY
aws_secret_access_key = TU_SECRET_KEY
aws_session_token = TU_SESSION_TOKEN
```

#### 2.4 Crear cuenta en Serverless Dashboard

Crear un usuario en [https://www.serverless.com/](https://www.serverless.com/) con tu correo `@utec.edu.pe` y un nombre de organización.

---

### 3. Clonar el repositorio

```bash
cd /home/ubuntu/
git clone https://github.com/Joaquin-oc/Hackaton-Cloud.git
cd Hackaton-Cloud/lambdas
```

Estructura del proyecto:

---

### 4. Configurar el serverless.yml

Modificar los campos `org` y `role` en el archivo `serverless.yml` con los datos de tu cuenta de Serverless Dashboard:

```yaml
org: TU_ORGANIZACION      # nombre de tu org en serverless.com
app: jobmatch-ai
```

---

### 5. Login a Serverless Dashboard

```bash
serverless login
```

Confirmar el login desde el enlace enviado a tu correo electrónico.

---

### 6. Configurar la API Key de Groq

```bash
export GROQ_API_KEY=tu_api_key_aqui
```

> ⚠️ Obtener la API Key en [https://console.groq.com/keys](https://console.groq.com/keys)

---

### 7. Desplegar la infraestructura

```bash
serverless deploy
```

o de forma abreviada:

```bash
sls deploy
```

Al finalizar, Serverless muestra en pantalla las URLs de los endpoints. Estas se configuran en el frontend para invocar las Lambdas y también pueden usarse para pruebas en Postman.

```
endpoints:
  GET  - https://xxxxxxx.execute-api.us-east-1.amazonaws.com/
  POST - https://xxxxxxx.execute-api.us-east-1.amazonaws.com/p
  ....
```

---

### 8. Desplegar el Frontend
1. Clone este repositorio en su maquina local..
2. Moverse a la carpeta /frontend e instalar dependencias
```bash
cd frontend
npm install
```

2. Crear la carpeta dist, el contenido que subes al bucket s3 y que referencia Amplify.
```bash
npm run build
```

3. Desde Amplify, configurar:
<img width="1426" height="488" alt="Captura de pantalla 2026-06-20 a la(s) 6 56 46 p  m" src="https://github.com/user-attachments/assets/6e25e18f-37b7-4ba2-a808-24e08eeba25c" />

y luego seleccionar método Amazon s3 
<img width="1426" height="488" alt="Captura de pantalla 2026-06-20 a la(s) 6 57 54 p  m" src="https://github.com/user-attachments/assets/5201b1ef-aa7d-4580-a4da-7b3a19b3746b" />

---

## Probar la Plataforma

Desde la url de Amplify:

### Preparar el CSV de prueba

Crear un archivo `ofertas_prueba.csv` con el siguiente formato (25 a 30 filas):

```csv
titulo,empresa,descripcion,salario,ubicacion
Data Analyst,BCP,Python SQL Power BI 3 años exp,3000-4000,Lima
Backend Developer,Interbank,Node.js AWS Docker 5 años exp,5000-7000,Remoto
Data Scientist,Belcorp,Machine Learning Scikit-learn MLOps,6000-8000,Lima
```

### Flujo de prueba paso a paso

1. Abrir la URL del frontend en el navegador
2. Registrar perfil: ingresar skills, años de experiencia y salario esperado
3. Hacer clic en **Subir CSV** y seleccionar `ofertas_prueba.csv`
4. Hacer clic en **Analizar ofertas**
5. Esperar 2 a 3 minutos — la tabla se llena en tiempo real
6. Verificar que cada oferta muestra: score, skills que coinciden, skills faltantes y resumen

### Verificar el flujo de reintentos

1. Subir un CSV con 30 ofertas para generar rate limit en Groq
2. En **AWS Console → SQS → jobmatch-ofertas-queue**: verificar mensajes procesados
3. Si hay mensajes en la DLQ, hacer clic en **Reprocesar fallidos** en el frontend
4. Verificar en DynamoDB que todos los registros tienen estado `completado`

### Ver logs en tiempo real

```bash
serverless logs -f processor --tail
```

---

## Solución de problemas frecuentes

**Error: Rate limit de Groq**
- Es esperado con 30 ofertas simultáneas. SQS reintenta automáticamente hasta 3 veces. Luego de 5 minutos, el lambda 7 vuelve enviarlos a la cola principal para reintentar.

**Error: AccessDeniedException durante el deploy**
- Verificar que las credenciales en `~/.aws/credentials` son correctas y tienen permisos suficientes.

**Los resultados no aparecen en el frontend**
- Verificar que la URL del API Gateway está correctamente configurada en el frontend.
