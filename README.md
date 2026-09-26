# TechPosure website

The deployable website is in `dist/`. The `TechPosure-Netlify.zip` archive places `index.html` at the root, so it can be uploaded directly to Netlify Drop or used for a manual Netlify deploy.

## Local preview

Serve the `dist/` directory with any static web server.

## Spatial preview branch

`feature/seamless-3d-experience` is an evaluation-only redesign. Do not merge or promote it without review. Production remains on `main`.

The foundation is **one persistent 3D background with semantic HTML chapters** (structure C). A single Three.js 0.186.0 renderer in `dist/spatial-world.js` follows the document's existing chapters and connects their visual metaphors in one world: network, origin path, services hub, process pipeline, Benton County, team, and contact. `dist/spatial.css` supplies the light foreground treatment. The original copy, links, sections, images, and Resend-backed form remain in HTML. The team presentation now precedes the form so contact concludes the journey.

The alternatives were considered: a fully camera-driven world (A) offers continuity but complicates long-form copy and forms; separate scenes (B) match the old implementation but reset the visual world and cost multiple WebGL contexts; pinned chapters (D) give precise control but add scroll friction, especially on phones. Structure C keeps the continuity without those costs.

Three.js is bundled locally with its MIT license. Nodes use instanced meshes and shared geometry, connections use batched line segments, and one canvas persists throughout scrolling. Pixel density and frame rate are capped, mobile geometry is simplified, background-tab rendering stops, and reduced-motion users get a static scroll-synchronized view. The global pause control remains. If WebGL cannot load, the original HTML/SVG diagrams and all content remain usable. The Benton County shape follows the supplied reference; routes are conceptual, not a claim of partnerships or live traffic.

## Contact form — enable receiving before launch

**Netlify:** Enable form detection in the site's Forms settings, then deploy `dist/` (or the updated Netlify ZIP). Confirm that `project-inquiry` appears in Forms. Configure email notifications for the team's chosen inbox in Project configuration → Notifications. Netlify processes the POST body and applies its spam filtering plus the included honeypot. No API secret is required. Send a real test inquiry after deployment and confirm receipt in the dashboard before announcing the site.

**Vercel:** This project uses `dist` as its project root, with its API handler and `/contact-submit` rewrite there. The repository root also has an API entrypoint for a future root-directory change. Use preset **Other** with no build command. Resend supplies `RESEND_API_KEY`; `CONTACT_FROM_EMAIL` must be set independently for Production and Preview to an address on the verified `techposure.org` domain. Keep the API key server-side. Choosing Aarush, Prasenjit, or Frederick sends to `aarush.divakarla@gmail.com`, `prasen.pani@gmail.com`, or `tobyf@bentonvillek12.org` respectively; choosing the team sends to all three. Before a production launch of this redesign, review rate limiting for `/contact-submit` and `/api/contact`.

Without the Vercel email settings, the form reports a delivery error and offers direct email links. A plain static local server also shows an error; it does not fake success. Preview form testing should confirm both the browser success state and delivery in Resend.

Vercel source ZIP: `TechPosure-Vercel.zip` (unzip and import the project into Git, or deploy its folder with the Vercel CLI). Netlify static ZIP: `TechPosure-Netlify.zip`.

## Source note

The Ignite facility photograph is sourced from the official [Ignite Professional Studies facility page](https://www.bentonvillek12.org/o/ignite/page/facility). The three team portraits were supplied for this website.
