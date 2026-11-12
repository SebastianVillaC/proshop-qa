# Verificaciones de seguridad OWASP Top 10 — ProShop v2
Fecha de ejecución: 2026-11-08T01:55:39.452Z  
Objetivo: http://localhost:5001/api

## Resumen

| ID | OWASP | Verificación | Resultado |
|---|---|---|---|
| SEC-01 | A01:2021 | Un cliente consulta el pedido de otro cliente (IDOR) | ✅ OK |
| SEC-02 | A01:2021 | Carga de archivos al servidor sin autenticación | ❌ Vulnerable |
| SEC-03 | A04:2021 | Pedido con cantidad negativa produce un total negativo | ❌ Vulnerable |
| SEC-04 | A03:2021 | El parámetro keyword se interpreta como expresión regular sin escapar | ❌ Vulnerable |
| SEC-05 | A03:2021 | Inyección de operadores NoSQL ($ne / $regex) en el inicio de sesión | ❌ Vulnerable |
| SEC-06 | A07:2021 | Sin límite de intentos de inicio de sesión (fuerza bruta) | ❌ Vulnerable |
| SEC-07 | A07:2021 | Se permiten contraseñas de 1 carácter | ❌ Vulnerable |
| SEC-08 | A07:2021 | El JWT no se invalida en el servidor al cerrar sesión (validez 30 días) | ❌ Vulnerable |
| SEC-09 | A05:2021 | Los errores 500 exponen el stack trace y rutas internas del servidor | ❌ Vulnerable |
| SEC-10 | A05:2021 | Faltan cabeceras de seguridad y se expone X-Powered-By | ❌ Vulnerable |
| SEC-11 | A01:2021 | Un cliente intenta auto-asignarse isAdmin en su perfil | ✅ OK |
| SEC-12 | A04:2021 | El cliente envía un precio manipulado (0.01) | ✅ OK |
| SEC-13 | A02:2021 | El listado de usuarios (admin) expone el hash de las contraseñas | ❌ Vulnerable |

**10 de 13 verificaciones evidencian una vulnerabilidad.**

## Detalle

### SEC-01 — Un cliente consulta el pedido de otro cliente (IDOR)
- **OWASP:** A01:2021 Broken Access Control
- **Resultado:** ✅ No vulnerable / control efectivo
- **Evidencia:**
```
John crea el pedido 6aefd69bb85354b014a2040e
GET /api/orders/6aefd69bb85354b014a2040e con la cookie de Jane -> HTTP 404
Datos expuestos: {}
```

### SEC-02 — Carga de archivos al servidor sin autenticación
- **OWASP:** A01:2021 Broken Access Control
- **Resultado:** ❌ VULNERABLE
- **Evidencia:**
```
POST /api/upload sin cookie -> HTTP 200
Respuesta: {"message":"Image uploaded successfully","image":"/uploads/image-1794102939629.jpg"}
```

### SEC-03 — Pedido con cantidad negativa produce un total negativo
- **OWASP:** A04:2021 Insecure Design
- **Resultado:** ❌ VULNERABLE
- **Evidencia:**
```
POST /api/orders qty=-5 -> HTTP 201
itemsPrice=-449.95 taxPrice=-67.49 totalPrice=-507.44
```

### SEC-04 — El parámetro keyword se interpreta como expresión regular sin escapar
- **OWASP:** A03:2021 Injection
- **Resultado:** ❌ VULNERABLE
- **Evidencia:**
```
GET /api/products?keyword=(  -> HTTP 500 "Regular expression is invalid: missing closing parenthesis"
GET /api/products?keyword=.* -> HTTP 200, 6 productos (el patrón ".*" coincide con todo)
```

### SEC-05 — Inyección de operadores NoSQL ($ne / $regex) en el inicio de sesión
- **OWASP:** A03:2021 Injection
- **Resultado:** ❌ VULNERABLE
- **Evidencia:**
```
POST /api/users/auth {"email":{"$ne":null},"password":"123456"} -> HTTP 200
Respuesta: {"_id":"6aefd69bcaf5cfb313d8c3ce","name":"Admin User","email":"admin@email.com","isAdmin":true}
POST /api/users/auth {"email":{"$regex":"^jane"},"password":"123456"} -> HTTP 200 "jane@email.com"
Impacto: se inicia sesión como el PRIMER usuario de la colección (el administrador) sin conocer su email; con $regex se enumeran cuentas carácter a carácter.
```

### SEC-06 — Sin límite de intentos de inicio de sesión (fuerza bruta)
- **OWASP:** A07:2021 Identification and Authentication Failures
- **Resultado:** ❌ VULNERABLE
- **Evidencia:**
```
30 intentos fallidos consecutivos -> códigos: 401 (ningún 429 ni bloqueo)
Intento 31 con la contraseña correcta -> HTTP 200
```

### SEC-07 — Se permiten contraseñas de 1 carácter
- **OWASP:** A07:2021 Identification and Authentication Failures
- **Resultado:** ❌ VULNERABLE
- **Evidencia:**
```
POST /api/users password="1" -> HTTP 201 {"_id":"6aefd69db85354b014a2043f","name":"Débil","email":"weak.1794102941512@test.co","isAdmin":false}
```

### SEC-08 — El JWT no se invalida en el servidor al cerrar sesión (validez 30 días)
- **OWASP:** A07:2021 Identification and Authentication Failures
- **Resultado:** ❌ VULNERABLE
- **Evidencia:**
```
POST /api/users/logout y luego GET /api/users/profile con el mismo token -> HTTP 200
```

### SEC-09 — Los errores 500 exponen el stack trace y rutas internas del servidor
- **OWASP:** A05:2021 Security Misconfiguration
- **Resultado:** ❌ VULNERABLE
- **Evidencia:**
```
GET /api/orders/abc -> HTTP 500
stack: CastError: Cast to ObjectId failed for value "abc" (type string) at path "_id" for model "Order" |     at ObjectId.cast (/Users/sebastian/Projects/Semestre8/AseguramientoDeLaCalidad/trabajoFinal/_staging/proshop-qa-completo/app/node_modules/mongoose/lib/schema/objectid.js:248:11) |     at SchemaType.applySetters (/Users/sebastian/Projects/Semestre8/AseguramientoDeLaCalidad/trabajoFinal/_staging/proshop-qa-completo/app/node_modules/mongoose/lib/schematype.js:1202:12)
```

### SEC-10 — Faltan cabeceras de seguridad y se expone X-Powered-By
- **OWASP:** A05:2021 Security Misconfiguration
- **Resultado:** ❌ VULNERABLE
- **Evidencia:**
```
X-Powered-By: Express
Cabeceras ausentes: x-content-type-options, content-security-policy, x-frame-options, strict-transport-security
```

### SEC-11 — Un cliente intenta auto-asignarse isAdmin en su perfil
- **OWASP:** A01:2021 Broken Access Control
- **Resultado:** ✅ No vulnerable / control efectivo
- **Evidencia:**
```
PUT /api/users/profile {"isAdmin":true} -> HTTP 200
GET /api/users/profile -> isAdmin=false
```

### SEC-12 — El cliente envía un precio manipulado (0.01)
- **OWASP:** A04:2021 Insecure Design
- **Resultado:** ✅ No vulnerable / control efectivo
- **Evidencia:**
```
POST /api/orders price=0.01 -> HTTP 201, precio registrado=89.99 (precio real 89.99)
```

### SEC-13 — El listado de usuarios (admin) expone el hash de las contraseñas
- **OWASP:** A02:2021 Cryptographic Failures
- **Resultado:** ❌ VULNERABLE
- **Evidencia:**
```
GET /api/users (admin) -> HTTP 200
¿Incluye campo password / hash bcrypt?: true
Muestra: {"_id":"6aefd69bcaf5cfb313d8c3ce","name":"Admin User","email":"admin@email.com","password":"$2a$10$SNaICnu9L4hGp8HHY54qJOWy9gzGViknM5Sg5jll/G5wpiv8QgzFC","isAdmin":true,"__v":0,"createdAt":"2026-11-08T01:55:39.414Z","updatedAt":"2026-11-08T01:55:39.414Z"}
```
