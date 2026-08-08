// In your Sanity Studio's sanity.config.ts:
//   import { schemaTypes } from './schemas'  (copy this folder in)
//   export default defineConfig({ ..., schema: { types: schemaTypes } })

import { siteSettings } from "./siteSettings";
import { journalPost } from "./journalPost";
import { exhibition } from "./exhibition";
import { artist } from "./artist";
import { artwork } from "./artwork";

export const schemaTypes = [siteSettings, journalPost, exhibition, artist, artwork];
