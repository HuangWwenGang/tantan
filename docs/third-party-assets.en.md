# Third-Party Assets and External Services

[简体中文](third-party-assets.md) | **English**

The repository retains remote sample assets and third-party dependencies used by the original project. This inventory documents their sources and runtime dependencies. It does not imply that all assets share one license or that the project author owns their copyrights.

| Type | Source referenced in the code | Purpose and notes |
| --- | --- | --- |
| Sample photos | `images.unsplash.com` | Merchant, food, avatar, and display images, mainly in each app's `data.ts` and selected components. Images do not represent real merchants, menu items, or business credentials |
| Fonts | `fonts.googleapis.com` | Noto Sans SC, Fredoka, Outfit, Inter, and others, referenced by each app's HTML. Fallback fonts may be used when network access is unavailable |
| Tailwind runtime | Each frontend's `public/tailwind.js` | All three frontends include a local script to avoid relying on CDN availability for styles. Use remains subject to the original dependency's license; build-time styles are a possible future improvement |
| Icons | npm package `lucide-react` | General interface icons; the apps also contain SVG decoration components within the project |
| Location descriptions | `geocode.maps.co` | The customer app requests a place description after browser geolocation. This depends on location permission, network access, and service availability |
| AI | `@google/genai` | Optional recommendations and island tips; requires a separately configured API key |
| Image storage | S3-compatible service | Optional merchant-image and payment-evidence uploads; requires separately configured storage, credentials, and access rules |

For public demonstrations, treat the included stores and reviews as demo data. In particular, sample images must not be presented as evidence of actual business licenses or genuine customer reviews.

No project-wide open-source license was added during this repository preparation. npm dependencies, fonts, and images remain subject to their respective licenses or terms. Before commercial use or redistribution of assets, check each source and the scope of its permission, and retain any required notices.
