<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

- Gift list data is reached only through SECURITY DEFINER RPCs that validate the family key; tables have RLS with no policies. Why: no accounts, and my-list must never expose who reserved a wish.
- Keep the remembered name in separate browser storage from the family session; signing out must remove the session without losing the name.
- Validate wish levels and HTTP(S) links in the keyed write RPC, and filter clickable links in both list views; client checks alone cannot protect direct calls.
- Circle RPCs validate normalized PINs and persist failed attempts before any exception-catching write block; legacy RPCs remain scoped to the marked original circle. Why: wrong PINs must advance lockout counters without exposing other circles or breaking the published app.
- Frontend gift reads and writes use only circle RPCs; adapt their actual `deseos` JSON field centrally in regalos.ts. Why: no cross-circle access or reservation disclosure.
- Session/identity helpers live in sesion-circulo.ts; read hashes and storage only after hydration or in handlers, discard legacy sessions, and notify the root on invalid saved credentials. Why: SSR safety and one consistent sign-out path.
