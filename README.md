# TechPosure website

The deployable website is in `dist/`. The `TechPosure-Netlify.zip` archive places `index.html` at the root, so it can be uploaded directly to Netlify Drop or used for a manual Netlify deploy.

## Local preview

Serve the `dist/` directory with any static web server.

## 3D diagrams

Three.js 0.186.0 is bundled locally in `dist/vendor/` with its MIT license. No CDN or build step is required. Six diagrams progressively enhance the hero, mission rail, process, Benton County map, and the two network service icons. The county silhouette follows the supplied reference; the routes are conceptual, not a claim of existing partnerships or live traffic. The brand mark stays unchanged.

Scenes initialize near the viewport, stop rendering offscreen and in background tabs, cap pixel density, respect reduced motion, and offer a global pause control. The original diagrams remain when WebGL is unavailable. Contact information is no longer placed in links or URL query strings.

## Contact form — enable receiving before launch

**Netlify:** Enable form detection in the site's Forms settings, then deploy `dist/` (or the updated Netlify ZIP). Confirm that `project-inquiry` appears in Forms. Configure email notifications for the team's chosen inbox in Project configuration → Notifications. Netlify processes the POST body and applies its spam filtering plus the included honeypot. No API secret is required. Send a real test inquiry after deployment and confirm receipt in the dashboard before announcing the site.

**Vercel:** Import the full project, including `api/` and `vercel.json`, with preset **Other**, root directory **the project root** (not `dist`), no build command, and output directory `dist`. The configuration rewrites `/contact-submit` to the server-side contact handler. Set `RESEND_API_KEY`, `CONTACT_FROM_EMAIL` (a verified Resend sender), and `CONTACT_TO_EMAIL` (your receiving inbox) in Vercel's environment settings, then redeploy. These must never be exposed in browser code. All inquiries go to that inbox with the requested teammate identified in the message. Enable a Vercel Firewall rate-limit rule for `/contact-submit` and `/api/contact` before public launch. The handler validates length, required fields, format and origin; the honeypot alone is not comprehensive abuse protection.

Without these hosting settings, the form cannot receive messages. A plain static local server intentionally shows a delivery error; it does not fake success. Browser and mocked endpoint checks do not confirm real email delivery.

Vercel source ZIP: `TechPosure-Vercel.zip` (unzip and import the project into Git, or deploy its folder with the Vercel CLI). Netlify static ZIP: `TechPosure-Netlify.zip`.

## Source note

The Ignite facility photograph is sourced from the official [Ignite Professional Studies facility page](https://www.bentonvillek12.org/o/ignite/page/facility). The three team portraits were supplied for this website.
