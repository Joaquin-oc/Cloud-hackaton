import json
import boto3
import urllib.request
import os

dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
tabla = dynamodb.Table(os.environ.get('TABLE_RESULTADOS', 'resultados-ofertas'))

GROQ_API_KEY = os.environ['GROQ_API_KEY']
GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

def llamar_groq(oferta_texto, perfil):
    prompt = f"""Eres un experto en reclutamiento laboral. Analiza la siguiente oferta de
trabajo y compárala a fondo contra el perfil del candidato. Lee con cuidado TODOS
los campos de la oferta (incluyendo salario, horas semanales, modalidad y
requerimientos), no solo el cargo y la descripción.

OFERTA DE TRABAJO:
{oferta_texto}

PERFIL DEL CANDIDATO:
{perfil}

Instrucciones para tu análisis:

1. "match_score": calcula un puntaje de 0 a 100 ponderando estos factores:
   - Stack técnico y habilidades (40%): qué tanto del stack que pide la oferta
     tiene el candidato.
   - Experiencia y seniority (25%): años de experiencia y nivel pedido vs lo que
     declara el candidato.
   - Modalidad (20%): si la modalidad (remoto/presencial/híbrido) es compatible
     con lo que busca el candidato.
   - Salario (15%): si el salario ofrecido está dentro, por encima o por debajo
     de la expectativa del candidato. Si alguno no especifica, este factor no
     penaliza.
   No promedies linealmente: una incompatibilidad dura en modalidad o seniority
   debe bajar el score significativamente aunque el stack técnico encaje bien.

2. "nivel_requerido": determina si la oferta es para "Junior", "Mid" o "Senior"
   basándote en los años de experiencia pedidos, el nivel de responsabilidad,
   si pide liderazgo de equipos y el stack requerido. No copies lo que diga la
   oferta textualmente; infiere el nivel real con criterio.

3. "salario_estimado": usa el campo "Salario ofrecido" de la oferta tal cual
   viene. Si trae un número o rango, repórtalo formateado (ej. "S/3000 - S/3500"
   o "$1200/mes"). Solo responde "No especificado" si el campo realmente viene
   vacío o dice "No especificado". Nunca inventes un monto.

4. "habilidades_requeridas": extrae ÚNICAMENTE las habilidades, tecnologías,
   herramientas y requisitos EXPLÍCITAMENTE mencionados en los campos
   "Requerimientos" y "Descripción" de la oferta. No agregues habilidades que
   no estén escritas. Máximo 10 ítems, priorizando las más relevantes para el
   rol.

5. "puntos_fuertes": lista los aspectos del perfil del candidato que SÍ encajan
   con lo que pide la oferta. Cada ítem debe ser concreto y mencionar tanto el
   requisito de la oferta como lo que aporta el candidato. Ejemplos:
   - "La oferta requiere Python como stack principal y el candidato lo maneja con
     2 años de experiencia."
   - "Ambos coinciden en modalidad híbrida."
   - "El candidato tiene experiencia en metodologías ágiles que la oferta menciona
     explícitamente."
   Máximo 5 ítems, solo los más relevantes. No inventes coincidencias que no
   estén respaldadas por el perfil y la oferta.

6. "brechas": lista las diferencias concretas entre lo que pide la oferta y lo
   que declara el candidato. Cada ítem debe ser específico y accionable, no vago.
   Ejemplos:
   - "La oferta pide 3 años de experiencia en React, el candidato declara 1 año."
   - "La oferta es presencial en Lima, el candidato busca trabajo remoto."
   - "La oferta pide liderar un equipo de 5 personas, el candidato no menciona
     experiencia de liderazgo."
   Si no hay brechas relevantes, devuelve una lista vacía [].

7. "recomendaciones_cv": escribe un texto corto de 2 a 4 frases dirigido al
   candidato con consejos concretos y específicos sobre qué agregar, destacar o
   reformular en su CV para esta oferta en particular. Menciona habilidades,
   experiencias o logros puntuales que debería visibilizar, términos exactos de
   la oferta que conviene usar, y si le falta algo relevante, sugiere cómo
   compensarlo (ej. proyectos personales, cursos cortos). No des consejos
   genéricos como "mejora tu CV"; cada frase debe estar anclada a algo concreto
   de esta oferta o de este perfil.

8. "veredicto": escribe UNA sola frase directa dirigida al candidato que comience
   con una de estas tres opciones: "Aplica ahora", "Aplica de todas formas" o
   "Espera antes de aplicar", seguida del motivo principal con el factor más
   determinante (técnico, de modalidad, de salario o de seniority). Ejemplos:
   - "Aplica ahora: tu stack técnico cubre el 90% de lo requerido y la modalidad
     es compatible, solo negocia el salario porque la oferta está por debajo de
     tu expectativa."
   - "Espera antes de aplicar: la oferta pide 3 años de experiencia en AWS y el
     candidato declara menos de 1, esa brecha técnica es difícil de compensar
     en una entrevista."
   - "Aplica de todas formas: el stack no encaja al 100% pero el perfil es sólido
     y la única brecha real es de una herramienta que se aprende rápido."

Responde SOLO con un JSON con esta estructura exacta, sin texto adicional, sin
bloques de markdown, sin explicaciones fuera del JSON:
{{
  "match_score": número entero del 0 al 100,
  "nivel_requerido": "Junior" | "Mid" | "Senior",
  "salario_estimado": "rango o monto tal como aparece en la oferta, o 'No especificado'",
  "habilidades_requeridas": ["máximo 10 habilidades explícitas de la oferta"],
  "puntos_fuertes": ["frase concreta punto fuerte 1", "frase concreta punto fuerte 2"],
  "brechas": ["frase concreta brecha 1", "frase concreta brecha 2"],
  "recomendaciones_cv": "texto corrido de 2 a 4 frases con consejos concretos para este CV y esta oferta.",
  "veredicto": "Aplica ahora / Aplica de todas formas / Espera antes de aplicar: motivo principal con factor determinante."
}}"""

    data = json.dumps({
        "model": "openai/gpt-oss-20b",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.2
    }).encode('utf-8')

    req = urllib.request.Request(
        GROQ_URL,
        data=data,
        headers={
            'Authorization': f'Bearer {GROQ_API_KEY}',
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (compatible; AWS-Lambda/1.0)'
        }
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            resultado = json.loads(response.read())
            texto = resultado['choices'][0]['message']['content']
            print(f"Respuesta cruda del modelo: {texto}")
            return json.loads(limpiar_json(texto))
    except urllib.error.HTTPError as e:
        if e.code == 429:
            raise Exception("RATE_LIMIT")
        raise e

def limpiar_json(texto):
    """Quita bloques de markdown (```json ... ```) y espacios que a veces
    el modelo agrega aunque se le pida solo JSON."""
    texto = texto.strip()
    if texto.startswith('```'):
        texto = texto.split('```')[1]
        if texto.startswith('json'):
            texto = texto[4:]
    texto = texto.strip()

    inicio = texto.find('{')
    fin = texto.rfind('}')
    if inicio != -1 and fin != -1:
        texto = texto[inicio:fin + 1]

    return texto

def lambda_handler(event, context):
    for record in event['Records']:
        mensaje = json.loads(record['body'])

        oferta_texto = f"""Empresa: {mensaje.get('empresa', 'No especificado')}
Cargo: {mensaje.get('cargo', 'No especificado')}
Modalidad: {mensaje.get('modalidad', 'No especificado')}
Lugar: {mensaje.get('lugar', 'No especificado')}
Salario ofrecido: {mensaje.get('salario', 'No especificado')}
Horas semanales: {mensaje.get('horas_semanales', 'No especificado')}
Requerimientos: {mensaje.get('requerimientos', 'No especificado')}
Descripción: {mensaje.get('descripcion', 'No especificado')}"""

        try:
            resultado = llamar_groq(oferta_texto, mensaje['perfil_usuario'])

            tabla.put_item(Item={
    'sesion_id': mensaje['sesion_id'],
    'oferta_id': mensaje['oferta_id'],
    'empresa': mensaje['empresa'],
    'cargo': mensaje['cargo'],
    'match_score': str(resultado.get('match_score', 0)),
    'nivel_requerido': resultado.get('nivel_requerido', ''),
    'salario_estimado': resultado.get('salario_estimado', ''),
    'habilidades': json.dumps(resultado.get('habilidades_requeridas', [])),
    'puntos_fuertes': json.dumps(resultado.get('puntos_fuertes', [])),      
    'brechas': json.dumps(resultado.get('brechas', [])),
    'recomendaciones_cv': resultado.get('recomendaciones_cv', ''),          
    'veredicto': resultado.get('veredicto', ''),
    'estado': 'completado'
})

        except Exception as e:
            if 'RATE_LIMIT' in str(e):
                raise e
            print(f"Error procesando oferta: {e}")
            raise e

    return {'statusCode': 200}