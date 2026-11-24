"""
Art spec for Dungeon of Rhune — every generated sprite, with its prompt.

Edit a prompt, delete the matching file under tools/art/out/, and re-run
`python3 tools/art/gen.py` to regenerate just that asset; then
`python3 tools/art/pack.py` to rebuild assets/art/.

Look: grim gothic high fantasy at dusk — an old frontier hamlet of dark
stone and black timber, steep slate roofs, pointed arches, gnarled trees,
mist and candlelight. Every world asset is forced onto PALETTE (map objects
via `color_image`, tilesets via `target_palette`) so it all reads as one
place; the game then tints the world to dusk and lights it (scripts/world/
atmosphere.gd). Keep the lamplight/fire/rune colours for things that glow:
the game finds those pixels and puts real lights on them.

Conventions
- World: 32px tiles ("high top-down"), characters on 64px canvases
  ("low top-down", 8 directions). Buildings/landmarks use the FRONT style:
  facade toward the camera, roof seen from above, no isometric diamond —
  the classic 16-bit RPG town look that matches the tiles.
- UI: item icons are 32px per inventory cell (a 2x3 armor is 64x96).
"""

# The world palette (47 colours). Ramps: cold stone/slate, dark timber, mud,
# moss/olive, bone, crimson, night blue, LIGHT (lamplight, fire), RUNE (cold
# glow), dusk purple, tarnished brass.
PALETTE = [
    "#0d0c10", "#17161c", "#22212a", "#2e2e38", "#3c3d48", "#4c4f5a", "#5f636d", "#767b83", "#92969b", "#b1b3b2",
    "#1f1712", "#2d2119", "#3d2d21", "#4f3b2b", "#644b36", "#7c5e43", "#977654",
    "#3a3427", "#4d4533", "#625942",
    "#18201a", "#212c22", "#2c3a2b", "#384833", "#47573c", "#586a47", "#6e7f55", "#8a9466",
    "#b9ab8a", "#d8ccae", "#ece3cb",
    "#3e1a1c", "#5e2326", "#842f2e",
    "#1f2738", "#2d3a52", "#435675",
    "#ffd98a", "#ffad4d", "#e86a2a", "#b8361e",
    "#6fd6ff", "#c6f4ff",
    "#3b2a44", "#5d4569",
    "#a4823e", "#d1ab55",
]

GOTHIC = "grim gothic high fantasy, ancient and weathered, muted desaturated colors, pixel art"
PROP_STYLE = f"{GOTHIC}, top-down rpg map object, standing alone, no ground under it"
ICON_STYLE = "dark fantasy arpg inventory item icon, single object centered, crisp pixel art"
CHAR_STYLE = "grim medieval dark fantasy townsfolk, pixel art"
FRONT_STYLE = (
    "classic 16-bit top-down RPG building seen from the front at a three-quarter angle, facade facing the viewer, "
    f"roof seen from above, no isometric angle, no ground platform, {GOTHIC}"
)
# Composition guides (tools/art/ref/<name>.png). gen.py desaturates the guide,
# resizes it to the target size over a flat background and passes it as
# init_image, so a re-generation keeps a front-facing composition (plain
# prompts drift into isometric corner views) while the prompt and palette set
# the look. Lower strength = more freedom.
REF_STRENGTH = 130
REF_STRENGTH_OVERRIDES = {"market_stall": 300}
# Small props that must face the camera like a 16-bit top-down ARPG draws them
# (Chronicon, Zelda): front toward the viewer, a sliver of top, never an
# isometric corner view. Their guides are drawn by tools/art/guides.py.
FRONT_PROPS = {"pillar", "dungeon_chest", "dungeon_chest_open", "strongbox", "crates", "hay", "cart", "gambler_wagon", "statue"}
FRONT_PROP_STYLE = (
    "classic 16-bit top-down ARPG map object, front face toward the viewer with only a sliver of its top visible, "
    f"straight-on, no isometric angle, no corner view, standing alone, no ground under it, {GOTHIC}"
)
for _n in FRONT_PROPS:
    REF_STRENGTH_OVERRIDES[_n] = 70
PROP_REFS = {
    "smithy", "trader", "herbalist", "tavern", "house_a", "house_b",
    "gate", "market_stall", "pit_entrance",
} | FRONT_PROPS
# Props drawn in the "low top-down" view (fronts toward the camera).
# Everything else uses PROP_STYLE ("high top-down").
FRONT_FACING = {
    "smithy", "trader", "herbalist", "lore_tower", "tavern", "house_a", "house_b",
    "gate", "market_stall", "pit_entrance", "chapel", "door_sealed", "door_open",
}
LOW_VIEW = {"tree_oak", "tree_oak_b", "tree_pine", "tree_pine_b", "tree_dead", "tree_dead_b", "standing_stone", "cart",
            "pillar", "wall_torch", "town_portal", "chains", "dungeon_chest", "dungeon_chest_open"}

# ---------------------------------------------------------------- characters
# name -> (prompt, animations [(template_id, [directions])]).
# Characters in CHAR_FROM_REF are first drawn as a palette-locked south-facing
# map object, which create-character-v3 then rotates and animates.
ALL_DIRS = ["south", "south-east", "east", "north-east", "north", "north-west", "west", "south-west"]
CHAR_FROM_REF = {
    "npc_trader", "npc_gambler",
    "mob_skeleton", "mob_archer", "mob_ghoul", "mob_brute", "mob_cultist", "mob_wraith", "boss_warden",
}
# Canvas size per character (default 64).
CHAR_SIZE = {"boss_warden": 96}
MOB = "small full body character sprite, whole figure visible from head to feet, standing, facing the viewer, grim dark fantasy dungeon monster, pixel art"
# Animations are (template_id, directions) or, for motions no template has,
# (name, directions, {"action": text, "frames": n}) drawn by PixelLab's v3
# custom animator. (The skeleton "attack" template doesn't fit humanoids.)


def mob_anims(attack: str) -> list:
    """Monsters: walk + attack in 8 directions, a death fall facing south."""
    return [
        ("walking-8-frames", ALL_DIRS),
        ("attack", ALL_DIRS, {"action": attack, "frames": 6}),
        ("falling-back-death", ["south"]),
    ]

CHARACTERS = {
    "player": (
        "hooded wandering adventurer in a weathered dark green cloak over leather armor, short sword at hip, small satchel, dark fantasy rpg hero",
        [
            ("walking-8-frames", ALL_DIRS), ("breathing-idle", ALL_DIRS),
            ("attack", ALL_DIRS, {"action": "swings his short sword in a quick forward slash", "frames": 6}),
            ("falling-back-death", ["south"]),
        ],
    ),
    # ------------------------------------------------------------- monsters
    "mob_skeleton": (f"undead skeleton warrior with a rusty notched sword and a cracked round shield, glowing pale eyes, {MOB}", mob_anims("slashes forward with its rusty sword")),
    "mob_archer": (f"skeleton archer in a tattered dark hood holding a bone bow, {MOB}", mob_anims("draws the bone bow and looses an arrow")),
    "mob_ghoul": (f"hunched grey skinned ghoul with long black claws and torn rags, {MOB}", mob_anims("lunges forward and rakes with its claws")),
    "mob_brute": (f"hulking bloated undead brute wrapped in rusted chains carrying a huge iron cleaver, {MOB}", mob_anims("raises the huge cleaver overhead and chops down")),
    "mob_cultist": (f"hooded crimson robed cultist holding a burning orb of fire in one hand, {MOB}", mob_anims("thrusts the burning orb forward and hurls a fire bolt")),
    "mob_wraith": (f"floating pale blue wraith in tattered grey robes with long clawed hands and a hollow glowing face, {MOB}", mob_anims("lunges forward slashing with its long clawed hands")),
    "boss_warden": (f"huge armored death knight boss with a great black axe and a cracked glowing hourglass set in his breastplate, {MOB}", mob_anims("swings the great axe in a heavy overhead chop")),
    "npc_smith": (
        f"stocky dwarf blacksmith with a braided red beard, leather apron, bare soot-stained arms, holding a heavy forge hammer, {CHAR_STYLE}",
        [("breathing-idle", ["south"])],
    ),
    "npc_trader": (
        f"gaunt travelling peddler in a hooded dark brown wool cloak over a patched leather coat, a big pack of wares on his back, holding a small lit lantern, full body, standing, facing the viewer, {CHAR_STYLE}",
        [("breathing-idle", ["south"])],
    ),
    "npc_herbalist": (
        f"elderly herbalist woman in a moss green shawl carrying a basket of herbs and a crooked wooden staff, {CHAR_STYLE}",
        [("breathing-idle", ["south"])],
    ),
    "npc_lore": (
        f"ancient frail scholar with a long white beard and tattered indigo robes, holding a glowing lantern and a thick old book, {CHAR_STYLE}",
        [("breathing-idle", ["south"])],
    ),
    "npc_gambler": (
        f"small full body character sprite of a sly gambler standing, whole figure visible from hood to boots, long dark burgundy hooded cloak, shadowed grinning face, flipping a gold coin, facing the viewer, {CHAR_STYLE}",
        [("breathing-idle", ["south"])],
    ),
    "npc_captain": (
        f"stern female guard captain in dented steel armor with a crimson tabard, holding a halberd, {CHAR_STYLE}",
        [("breathing-idle", ["south"])],
    ),
}

# ------------------------------------------------------------------ tilesets
# Built in order (PixelLab "pro" tilesets on PALETTE); "*_base_from" reuses
# another set's terrain so the shared ground matches between sets.
GRASS = "dark wild moorland grass, muted olive and grey green, short wiry tufts, a few dark pebbles"
DIRT = "smooth dark packed earth path, grey brown, soft mottled texture, a few tiny pebbles, no stripes, no ruts"
COBBLE = "small irregular worn dark grey cobblestones, uneven old stones with dark mud in the gaps"
WATER = "dark murky blue green marsh water with faint ripples and pale reflections"
# Soft, slightly ragged borders (pro: raggedness 0..1, roundness 0 square..1 round).
EDGE = {"raggedness": 0.35, "roundness": 0.9}
TILESETS = [
    # lower_base_from itself: re-rolling the set keeps the grass every other set matches.
    {"name": "grass_dirt", "lower": GRASS, "lower_base_from": ("grass_dirt", "lower"), "upper": DIRT, **EDGE},
    {"name": "grass_cobble", "lower": GRASS, "lower_base_from": ("grass_dirt", "lower"), "upper": COBBLE, **EDGE},
    {
        "name": "water_grass",
        "lower": WATER,
        "upper": GRASS,
        "upper_base_from": ("grass_dirt", "lower"),
        "transition": "dark muddy reedy bank",
        "transition_size": 0.25,
        **EDGE,
    },
    {
        "name": "dirt_cobble",
        "lower": DIRT,
        "lower_base_from": ("grass_dirt", "upper"),
        "upper": COBBLE,
        "upper_base_from": ("grass_cobble", "upper"),
        **EDGE,
    },
]
# The Sealed Stair's rooms: floor ("lower") inside, solid rock ("upper") around,
# and transition_size 1.0 makes a "cliff" set: rock edges with a brick wall
# face below them (two cell rows), so north walls show their face.
DUNGEON_TILESET = {
    "name": "dungeon",
    "lower": "dark dungeon floor of worn grey stone flagstones with thin cracks",
    "upper": "solid black rock, top of a dungeon wall",
    "transition": "tall dark grey stone brick dungeon wall face",
    "transition_size": 1.0,
}
TILESETS.append(DUNGEON_TILESET)

# pack.py recolours tiles after generation: the model reaches for the timber
# browns for mud, so they become the palette's grey-brown mud.
MUD_REMAP = {"#4f3b2b": "#4d4533", "#644b36": "#625942", "#3d2d21": "#3a3427", "#7c5e43": "#625942"}
# ...and the grass's brightest tufts go dry and olive: a moor, not a lawn.
MOOR_REMAP = {"#586a47": "#47573c", "#6e7f55": "#625942", "#8a9466": "#6e7f55"}
TILE_REMAP = {
    "grass_dirt": {**MUD_REMAP, **MOOR_REMAP},
    "grass_cobble": {**MUD_REMAP, **MOOR_REMAP},
    "water_grass": MOOR_REMAP,
    "dirt_cobble": MUD_REMAP,
}

# pack.py recolours these props after generation. The model draws lit windows
# in pale parchment; on the tavern (dark timber, so parchment = windows only)
# they become lamplight, which the game then lights.
LIT_WINDOWS = {"#d8ccae": "#ffd98a", "#b9ab8a": "#ffad4d", "#ece3cb": "#ffd98a"}
PROP_REMAP = {"tavern": LIT_WINDOWS}

# --------------------------------------------------------------------- props
# name -> (w, h, prompt)
LIT = "glowing warm amber candlelit windows"
PROPS = {
    # buildings / landmarks
    "smithy": (240, 216, "blacksmith forge workshop, rough dark fieldstone walls, heavy black timber beams, dark slate roof, glowing orange forge fire and hot coals in a stone hearth, iron anvil out front, tall stone chimney"),
    "trader": (216, 192, f"old merchant trading post, dark stone ground floor and black timber upper floor, steep slate roof, faded dark crimson cloth awning over the door, crates and sacks of goods, {LIT}"),
    "herbalist": (192, 192, "crooked witch herbalist cottage, rough stone walls, heavy dark mossy thatched roof, bundles of drying herbs and hanging bottles by the door, a small round window with warm candlelight"),
    "lore_tower": (192, 264, "tall round gothic stone library tower, steep conical dark slate spire roof, tall pointed arch windows glowing with warm candlelight, iron lantern by the arched door, creeping ivy"),
    "gambler_wagon": (128, 96, "covered traveller wagon with a dark plum canvas cover, hanging bone charms and dice, a small lit lantern, old wooden wheels, seen exactly from the side"),
    "tavern": (288, 240, f"large old two story tavern inn, dark grey stone ground floor and black timber framed upper floor, steep dark slate roof with chimneys, pointed gothic arched door, {LIT}, blank hanging iron sign without any text"),
    "house_a": (192, 192, "small old stone cottage, rough grey fieldstone walls, steep dark mossy thatched roof, heavy wooden door, one small window with warm candlelight"),
    "house_b": (168, 168, "narrow old timber framed house, black beams and grey plaster, steep dark slate roof, crooked stone chimney, one small window with warm candlelight"),
    "chapel": (208, 240, "small ruined gothic stone chapel, tall pointed arch doorway, broken round rose window, steep dark slate roof with a small bell tower, crumbling buttresses, creeping ivy, candlelight inside the doorway"),
    "pit_entrance": (240, 216, "ancient sealed stone archway set into a low rocky mound, worn stone stairs descending into darkness, heavy rusted iron chains across the opening, two broken pillars carved with faintly glowing pale blue runes"),
    "gate": (240, 192, "fortified town gatehouse of dark weathered stone, two squat crenellated towers, heavy iron portcullis closed over an arched gateway, burning torches on the walls"),
    "waypoint": (96, 96, "ring of ancient weathered standing stones carved with glowing pale blue runes around a flat cracked stone dais, seen from above"),
    "wishing_well": (64, 80, "old moss covered stone well with a small dark slate roof, rope and wooden bucket"),
    "strongbox": (48, 48, "heavy iron banded dark oak strongbox with a flat lid and a big iron lock, closed, seen straight from the front"),
    "notice_board": (64, 64, "weathered dark wooden notice board under a small slate roof, pinned yellowed parchment notices"),
    "statue": (64, 112, "weathered grey stone statue of a hooded knight holding up a lantern with a warm glowing flame, on a square mossy pedestal, seen straight from the front"),
    "market_stall": (144, 120, "old market stall, dark weathered wooden frame, faded dark green and bone striped cloth canopy, baskets of turnips, apples and bread, wooden support posts at each corner"),
    # nature
    "tree_oak": (144, 192, "huge ancient gnarled oak tree, thick twisted dark trunk, exposed roots, dense dark green-grey canopy"),
    "tree_pine": (96, 168, "tall dark fir tree, dense drooping dark blue-green needles"),
    "tree_dead": (80, 112, "twisted dead leafless black tree with clawlike branches"),
    # second takes of the trees, so the forest edge isn't one sprite repeated
    "tree_oak_b": (144, 192, "huge ancient gnarled oak tree, thick twisted dark trunk, exposed roots, dense dark green-grey canopy"),
    "tree_pine_b": (96, 168, "tall dark fir tree, dense drooping dark blue-green needles"),
    "tree_dead_b": (80, 112, "twisted dead leafless black tree with clawlike branches"),
    "standing_stone": (32, 64, "tall weathered standing stone with moss and a faint carved spiral"),
    "bush": (48, 40, "dark thorny bramble bush"),
    "rock_big": (48, 40, "mossy dark grey boulder"),
    "rocks_small": (32, 32, "cluster of small dark grey stones"),
    "flowers": (32, 32, "small patch of pale white wild flowers among dark ferns"),
    "grass_tuft": (32, 32, "tuft of tall dry pale moor grass"),
    "mushrooms": (32, 32, "cluster of small pale grey toadstools"),
    # clutter
    "barrel": (32, 32, "old dark wooden barrel with rusted iron bands"),
    "crates": (48, 48, "two stacked old dark wooden crates with flat fronts facing the viewer, seen straight from the front"),
    "hay": (48, 40, "old grey-brown rectangular hay bale tied with twine, seen from the front"),
    "lamp_post": (32, 80, "tall wrought iron gothic street lantern on a black iron post, glowing warm candle flame inside the glass"),
    "brazier": (32, 48, "tall black iron brazier on three legs filled with burning coals and bright orange flames"),
    "cart": (80, 64, "old two wheeled wooden hand cart loaded with grey sacks, seen exactly from the side, the wheel toward the viewer"),
    "campfire": (48, 48, "campfire with burning logs and bright orange flames in a ring of dark stones"),
    "signpost": (32, 64, "old weathered dark wooden signpost with crooked arrow boards"),
    "fence": (64, 32, "short section of weathered dark wooden fence, horizontal"),
    "stone_wall": (96, 40, "low crumbling dry stone wall segment with moss, horizontal"),
    "banner": (32, 80, "tall dark wooden pole with a long tattered dark crimson banner bearing a pale silver thorn branch emblem"),
    "grave_a": (32, 48, "old cracked weathered gothic tombstone with moss"),
    "grave_b": (32, 48, "leaning weathered stone celtic cross grave marker"),
    "crow": (32, 32, "black crow perched, seen from the side"),
    # --------------------------------------------------- the Sealed Stair
    "door_sealed": (96, 96, "massive arched stone dungeon doorway sealed by a rusted iron portcullis, carved frame with faint red runes"),
    "door_open": (96, 96, "massive arched stone dungeon doorway standing open, worn stone steps descending into darkness, faint pale blue glow from below"),
    "dungeon_chest": (48, 48, "ornate iron bound dark oak treasure chest with an arched lid and tarnished gold trim, closed, seen straight from the front"),
    "dungeon_chest_open": (48, 48, "ornate iron bound dark oak treasure chest with tarnished gold trim, lid standing open behind it, heaped glowing gold coins inside, seen straight from the front"),
    "pillar": (48, 96, "thick square ancient dark stone dungeon pillar with carved runes, a heavy capital and a cracked plinth, seen straight from the front"),
    "wall_torch": (32, 48, "iron wall sconce holding a burning torch with a bright orange flame"),
    "bones": (32, 32, "scattered old bones and a skull lying on a stone floor"),
    "skull_pile": (48, 32, "small heap of skulls and bones"),
    "blood_pool": (48, 32, "dark dried blood splatter, flat on the floor"),
    "rubble": (48, 32, "pile of broken grey stone rubble"),
    "summon_circle": (64, 64, "summoning circle of glowing red runes carved into a dark stone floor, seen from directly above"),
    "town_portal": (64, 80, "upright oval swirling magic portal of pale blue light"),
    "chains": (32, 64, "rusted iron chains with shackles hanging down"),
    "goose": (32, 32, "grey and white farm goose with an orange beak, looking angry"),
}

# --------------------------------------------------------------------- icons
# name -> (cells_w, cells_h, prompt). 32px per cell.
ICONS = {
    # weapons
    "dagger": (1, 2, "steel dagger with leather wrapped hilt, vertical, point up"),
    "short_sword": (1, 3, "short sword with straight steel blade and simple crossguard, vertical, point up"),
    "greatsword": (1, 4, "huge two handed greatsword with long grip, vertical, point up"),
    "hand_axe": (1, 3, "small hand axe with wooden haft, vertical"),
    "war_axe": (2, 3, "double bladed battle axe, vertical"),
    "club": (1, 3, "heavy wooden club studded with iron spikes, vertical"),
    "mace": (1, 3, "flanged iron mace, vertical"),
    "maul": (2, 3, "huge two handed war hammer, vertical"),
    "spear": (1, 4, "long spear with leaf shaped steel head, vertical"),
    "short_bow": (2, 3, "wooden recurve short bow with taut bowstring, vertical, archery weapon"),
    "wand": (1, 2, "carved bone wand with a glowing tip, vertical"),
    "staff": (1, 4, "gnarled wooden staff topped with a pale crystal, vertical"),
    "scepter": (1, 3, "golden scepter topped with a red gem, vertical"),
    # off-hands
    "buckler": (2, 2, "small round wooden buckler shield with iron rim"),
    "kite_shield": (2, 3, "steel kite shield with faded heraldry"),
    "tome": (2, 2, "leather bound spell tome with a brass clasp and a glowing rune"),
    # armor
    "cap": (2, 2, "simple leather cap"),
    "helm": (2, 2, "iron great helm with a narrow visor slit"),
    "hood": (2, 2, "dark cloth hood"),
    "quilted_armor": (2, 3, "padded quilted gambeson tunic"),
    "leather_armor": (2, 3, "studded leather armor vest"),
    "chain_mail": (2, 3, "chain mail shirt made of interlocking steel rings, torso armor, front view"),
    "breastplate": (2, 3, "polished steel breastplate"),
    "robe": (2, 3, "long mage robe with runic embroidered trim"),
    "gloves": (2, 2, "pair of leather gloves"),
    "gauntlets": (2, 2, "pair of steel plate gauntlets"),
    "boots": (2, 2, "pair of leather boots"),
    "greaves": (2, 2, "pair of steel plated boots"),
    "sash": (2, 1, "knotted cloth sash belt, horizontal"),
    "belt": (2, 1, "leather belt with iron buckle and pouches, horizontal"),
    "heavy_belt": (2, 1, "wide heavy leather belt with iron studs, a large iron buckle and charm loops, horizontal"),
    "war_girdle": (2, 1, "thick steel plated war girdle with rivets, a skull buckle and charm hooks, horizontal"),
    # jewelry
    "ring_a": (1, 1, "gold ring with a red ruby"),
    "ring_b": (1, 1, "silver ring with a blue sapphire"),
    "ring_c": (1, 1, "carved bone ring"),
    "amulet_a": (1, 1, "gold amulet with a green emerald on a chain"),
    "amulet_b": (1, 1, "silver pendant shaped like a crescent moon on a chain"),
    "amulet_c": (1, 1, "wooden talisman with a carved eye on a cord"),
    # curios (charms that work from the backpack)
    "curio_s_a": (1, 1, "lucky white rabbit foot charm on a small brass chain"),
    "curio_s_b": (1, 1, "tiny glass jar of glowing fireflies"),
    "curio_s_c": (1, 1, "carved bone dice"),
    "curio_m_a": (1, 2, "bundle of black crow feathers tied with twine, vertical"),
    "curio_m_b": (1, 2, "small wax candle stub with a glowing rune carved in it, vertical"),
    "curio_l_a": (1, 3, "necklace of animal fangs and wooden beads hanging vertically, tribal charm"),
    "curio_l_b": (1, 3, "rolled ancient scroll tied with a red ribbon, vertical"),
    # consumables & misc
    "potion_red": (1, 1, "small round glass flask of red healing potion"),
    "potion_blue": (1, 1, "small round glass flask of blue mana potion"),
    "potion_purple": (1, 1, "small round glass flask of swirling purple potion"),
    "scroll": (1, 1, "rolled parchment scroll with a wax seal"),
    "gold": (1, 1, "small pile of gold coins"),
    "page": (1, 1, "torn yellowed parchment page with faded writing"),
    "key": (1, 1, "ornate old iron skeleton key"),
}

# Rhunes: one icon each (32x32). (name, glow colour, glyph description)
RHUNES = [
    ("ash", "pale grey", "a single vertical line"),
    ("thorn", "green", "a thorn shaped hook"),
    ("ember", "orange", "a flame shaped glyph"),
    ("frost", "icy blue", "a six pointed snowflake glyph"),
    ("volt", "yellow", "a lightning bolt zigzag"),
    ("blight", "sickly green", "a spiral glyph"),
    ("iron", "steel grey", "a square shield glyph"),
    ("hollow", "violet", "an empty circle glyph"),
    ("crown", "gold", "a three pointed crown glyph"),
    ("tide", "teal", "a wave glyph"),
    ("omen", "crimson", "an eye glyph"),
    ("zenith", "white", "an eight pointed star glyph"),
]
