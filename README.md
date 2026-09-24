# TechPosure website

The deployable website is in `dist/`. The `TechPosure-Netlify.zip` archive places `index.html` at the root, so it can be uploaded directly to Netlify Drop or used for a manual Netlify deploy.

## Local preview

Serve the `dist/` directory with any static web server.

## 3D diagrams

Three.js 0.186.0 is bundled locally in `dist/vendor/` with its MIT license. No CDN or build step is required. Six diagrams progressively enhance the hero, mission rail, process, Benton County map, and the two network service icons. The county silhouette follows the supplied reference; the routes are conceptual, not a claim of existing partnerships or live traffic. The brand mark stays unchanged.

Scenes initialize near the viewport, stop rendering offscreen and in background tabs, cap pixel density, respect reduced motion, and offer a global pause control. The original diagrams remain when WebGL is unavailable. Contact information is no longer placed in links or URL query strings.

## Contact form — enable receiving before launch

**Netlify:** Enable form detection in the site's Forms settings, then deploy `dist/` (or the updated Netlify ZIP). Confirm that `project-inquiry` appears in Forms. Configure email notifications for the team's chosen inbox in Project configuration → Notifications. Netlify processes the POST body and applies its spam filtering plus the included honeypot. No API secret is required. Send a real test inquiry after deployment and confirm receipt in the dashboard before announcing the site.

**Vercel:** This project currently uses `dist` as its project root. That folder now contains its own API handler and `/contact-submit` rewrite. The repository root also has an API entrypoint for a future root-directory change. Use preset **Other** with no build command. To activate sending, [accept the Resend Marketplace terms](https://vercel.com/gamerxverses-projects/~/integrations/accept-terms/resend?source=cli), connect Resend to the `techposure` Vercel project, and set `CONTACT_FROM_EMAIL` to an address on a domain verified in Resend. The integration provisions `RESEND_API_KEY`; keep it server-side. Choosing Aarush, Prasenjit, or Frederick sends to `aarush.divakarla@gmail.com`, `prasen.pani@gmail.com`, or `tobyf@bentonvillek12.org` respectively; choosing the team sends to all three. Set a Vercel Firewall rate-limit rule for `/contact-submit` and `/api/contact` before public launch. Send a real test inquiry to each recipient after activation and confirm delivery.

Without the Vercel email settings, the form reports a delivery error and offers direct email links. A plain static local server also shows an error; it does not fake success. Browser and mocked endpoint checks do not confirm real email delivery.

Vercel source ZIP: `TechPosure-Vercel.zip` (unzip and import the project into Git, or deploy its folder with the Vercel CLI). Netlify static ZIP: `TechPosure-Netlify.zip`.

## Source note

The Ignite facility photograph is sourced from the official [Ignite Professional Studies facility page](https://www.bentonvillek12.org/o/ignite/page/facility). The three team portraits were supplied for this website.
