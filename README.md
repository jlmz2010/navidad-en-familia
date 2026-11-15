# Navidad en Familia

Rol: Desarrollador UI/UX y Frontend.

Contexto: App web en español para que mi familia arme su lista de regalos de Navidad. Sin registro: cada quien entra con una clave familiar única y su nombre de pila. Mobile-first, simple y cálida.

Tarea: Crea el componente de entrada y el esquema de datos del ciclo 1.

Requisitos de negocio:

- Pantalla 1: campo "Clave familiar" y campo "Tu nombre". Botón Entrar. El nombre se guarda en el celular (localStorage).

- Cada persona puede tener de 3 a 4 deseos. Cada deseo: título, nivel (Sin costo / Muy barato / Normal), link opcional y nota opcional.

- Los 3 primeros deseos son obligatorios, uno por nivel. El 4º es opcional, de cualquier nivel.

- Pantalla "Mi lista": agregar, editar y borrar mis deseos. Aquí NO se muestra si alguien apartó uno.

- Pantalla "Familia": las listas de los demás, agrupadas por persona. Cada deseo tiene botón "Yo lo regalo". Si alguien lo aparta, los demás lo ven como "Ya elegido" (gris, sin botón). Quien lo apartó puede deshacerlo.

- Regalar es opcional. Texto amable, nada de presión.

Especificaciones técnicas: React + Tailwind (Lovable), Supabase. Tabla deseos: id, persona, titulo, nivel, link, nota, apartado_por, creado. Tabla config con la clave familiar.

Restricciones: Sin acceso público a las tablas. RLS cerrado; todo el acceso por funciones RPC que validan la clave familiar. La función que devuelve MI lista nunca regresa apartado_por. Sin cuentas ni correos.

Validación: [PO] 3 niveles claros y regalar opcional. [MK] Tono familiar, español de México, usable en celular.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/4ac64b2c-de19-47d5-ad96-e51e46afdc3d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
