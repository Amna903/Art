-- Artist profiles from "NUA ARTE website copy and editorial direction" (9 Oct 2026).
--
-- NOT a migration: run this by hand in the Supabase SQL editor only after
-- Nilton has confirmed the names and the use of personal background
-- (the document marks these as curatorial drafts, not artist quotations).
--
-- Sets the English bio and the medium for five admin-managed artists.
-- Peniel Joshe's alias is left out until its spelling is reconciled.
-- Each UPDATE matches one artist by name; check the "UPDATE 1" results.

BEGIN;

UPDATE public.managed_artists
  SET bio = 'Before the image resolves, there is the surface: grains of sand gathered into color, light and form. In Blanche Buanga’s work, that texture makes looking feel almost tactile. Shaded shapes take on volume; the eye follows the transitions and imagines the surface beneath a hand.

Known artistically as N. Niima, Buanga draws on visions and imagination. His practice carries knowledge learned from parents and grandparents, developed through his own work with dyed sand. His biography also includes displacement from Congo.

The invitation in these works begins with close attention. Stay with a contour or a change in color, and the material becomes part of the encounter.',
      technique = 'Dyed sand on canvas'
  WHERE display_name ILIKE 'Blanche Buanga%';

UPDATE public.managed_artists
  SET bio = 'A face appears among intersecting shapes. Nearby, a hand or a gesture gives the eye another place to land. Zico Pemble’s paintings move between recognizable figures and abstraction, allowing familiarity and surprise to share the canvas.

Curved lines meet angular forms; patterned details and layered surfaces keep the eye moving. For a viewer, the pleasure can lie in returning to a painting and noticing a relationship between shapes that was missed the first time.

Pemble’s ideas draw on everyday encounters, remembered dreams and imagination. Skills learned from parents and grandparents connect his practice to earlier generations, while his compositions make room for a perspective of his own.',
      technique = 'Acrylic on canvas'
  WHERE display_name ILIKE 'Zico Pemble%';

UPDATE public.managed_artists
  SET bio = 'Small details reward a slow look in José Proença’s work. A silhouette, an architectural line or the space between people can give an everyday scene its character. The grain of sand softens the surface while precise outlines hold the image together.

Proença brings daily life, dreams and imagination into his practice, building on knowledge learned from parents and grandparents. Working with dyed sand, he balances the texture of the material with careful definition.

His paintings invite attention to surroundings as well as figures. For those drawn to quiet detail, there is room to linger and discover how a scene is held together.',
      technique = 'Dyed sand on canvas'
  WHERE display_name ILIKE 'José Proença%';

UPDATE public.managed_artists
  SET bio = 'The eye travels through Simão Zmbu’s paintings. Sweeping curves meet angular divisions, and overlapping forms offer several places to begin. A shape catches attention; another draws it onward. Looking becomes a gradual exploration of the canvas.

Zmbu draws inspiration from daily life, dreams and imagination, developing artistic knowledge learned within his family. He is an artist and refugee from Congo. These are parts of his biography; the meaning of each composition remains open to the viewer.

Layered brushwork gives the work a physical presence. It rewards a viewer willing to stay with its movement and let details emerge in their own time.',
      technique = 'Acrylic on canvas'
  WHERE display_name ILIKE 'Simão Zmbu%';

UPDATE public.managed_artists
  SET bio = 'Peniel Joshe’s figures make an immediate impression. Large eyes, emphatic gestures and unexpected proportions bring a charged presence to the canvas. Vivid color intensifies the encounter, while flowing lines keep the composition in motion.

His inspiration draws from everyday experience and images formed in dreams and imagination. Artistic learning passed through parents and grandparents informs his personal approach to painting.

For the viewer, an expression may feel playful, unsettling or mysterious. That openness is part of the invitation: look again, follow a gesture, and decide what the encounter brings to you.',
      technique = 'Acrylic on canvas'
  WHERE display_name ILIKE 'Peniel Joshe%';

COMMIT;
