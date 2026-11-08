"""
Art spec for Dungeon of Rhune — every generated sprite, with its prompt.

Edit a prompt, delete the matching file under tools/art/out/, and re-run
`python3 tools/art/gen.py` to regenerate just that asset; then
`python3 tools/art/pack.py` to rebuild public/art/.

Conventions
- World: 32px tiles, "high top-down" props, characters on 64px canvases
  ("low top-down", 8 directions).
- UI: item icons are 32px per inventory cell (a 2x3 armor is 64x96).
"""

PROP_STYLE = "dark fantasy medieval frontier village, muted earthy palette, pixel art, top-down rpg map object"
ICON_STYLE = "dark fantasy arpg inventory item icon, single object centered, crisp pixel art"
CHAR_STYLE = "dark fantasy rpg townsfolk, pixel art"

# ---------------------------------------------------------------- characters
# name -> (prompt, animations [(template_id, [directions])])
ALL_DIRS = ["south", "south-east", "east", "north-east", "north", "north-west", "west", "south-west"]

CHARACTERS = {
    "player": (
        "hooded wandering adventurer in a weathered dark green cloak over leather armor, short sword at hip, small satchel, dark fantasy rpg hero",
        [("walking-8-frames", ALL_DIRS), ("breathing-idle", ALL_DIRS)],
    ),
    "npc_smith": (
        f"stocky dwarf blacksmith with a braided red beard, leather apron, bare soot-stained arms, holding a heavy forge hammer, {CHAR_STYLE}",
        [("breathing-idle", ["south"])],
    ),
    "npc_trader": (
        f"cheerful plump merchant with a feathered cap, colorful patched coat and a fat coin purse on his belt, {CHAR_STYLE}",
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
        f"sly gambler with a wide brimmed hat, an eyepatch and a long burgundy coat, flipping a gold coin, {CHAR_STYLE}",
        [("breathing-idle", ["south"])],
    ),
    "npc_captain": (
        f"stern female guard captain in dented steel armor with a crimson tabard, holding a halberd, {CHAR_STYLE}",
        [("breathing-idle", ["south"])],
    ),
}

# ------------------------------------------------------------------ tilesets
# Built in order; "base" refs reuse another set's base tile so grass matches.
TILESETS = [
    {
        "name": "grass_dirt",
        "lower": "lush dark green grass with small tufts and tiny clover",
        "upper": "worn brown dirt road with small pebbles",
        "transition": "",
        "transition_size": 0.0,
    },
    {
        "name": "grass_cobble",
        "lower": "lush dark green grass with small tufts and tiny clover",
        "lower_base_from": ("grass_dirt", "lower"),
        "upper": "old grey cobblestone town square pavement",
        "transition": "",
        "transition_size": 0.0,
    },
    {
        "name": "water_grass",
        "lower": "dark murky green-blue pond water with gentle ripples",
        "upper": "lush dark green grass with small tufts and tiny clover",
        "upper_base_from": ("grass_dirt", "lower"),
        "transition": "muddy grassy bank",
        "transition_size": 0.25,
    },
    {
        "name": "dirt_cobble",
        "lower": "worn brown dirt road with small pebbles",
        "lower_base_from": ("grass_dirt", "upper"),
        "upper": "old grey cobblestone town square pavement",
        "upper_base_from": ("grass_cobble", "upper"),
        "transition": "",
        "transition_size": 0.0,
    },
]

# --------------------------------------------------------------------- props
# name -> (w, h, prompt)
PROPS = {
    # buildings / landmarks
    "smithy": (160, 144, "village blacksmith workshop, stone forge with glowing coals under a timber lean-to roof, anvil out front, brick chimney"),
    "trader": (144, 128, "merchant shop, timber frame house with a striped awning over the door and crates of goods out front"),
    "herbalist": (128, 128, "herbalist cottage with a mossy thatched roof, bundles of drying herbs hanging by the door, tiny garden"),
    "lore_tower": (128, 176, "tall narrow stone library tower with a pointed slate roof, a round window and a lantern by the door"),
    "gambler_wagon": (128, 96, "colorful fortune teller wagon with a purple canopy, hanging dice and coins, wooden wheels"),
    "tavern": (192, 160, "large two story timber tavern inn with a hanging wooden sign and warm lit windows"),
    "house_a": (128, 128, "small stone cottage with a thatched roof and a wooden door"),
    "house_b": (112, 112, "timber frame village house with a red clay tiled roof"),
    "pit_entrance": (144, 128, "dark square pit in the ground with stone stairs descending into blackness, four broken ancient stone pillars with glowing blue runes at the corners, heavy rusted chains across the opening"),
    "gate": (128, 112, "wooden palisade town gate with two small watchtowers and an open gateway"),
    "waypoint": (96, 96, "circle of small standing stones with glowing cyan runes around a flat carved stone platform"),
    "wishing_well": (64, 80, "old stone wishing well with a little wooden roof and a bucket on a rope"),
    "strongbox": (48, 48, "large iron banded wooden treasure chest, closed"),
    "notice_board": (64, 64, "wooden village notice board with pinned parchment notes"),
    "statue": (64, 112, "weathered stone statue of a hooded warrior holding up a lantern, on a square pedestal"),
    "market_stall": (96, 80, "market stall with a green and white striped canopy and baskets of fruit"),
    # nature
    "tree_oak": (96, 128, "large leafy oak tree"),
    "tree_pine": (64, 112, "tall dark green pine tree"),
    "tree_dead": (80, 112, "twisted dead leafless tree"),
    "bush": (48, 40, "round leafy green bush"),
    "rock_big": (48, 40, "mossy grey boulder"),
    "rocks_small": (32, 32, "cluster of small grey stones"),
    "flowers": (32, 32, "small patch of wildflowers in grass"),
    "grass_tuft": (32, 32, "tuft of tall wild grass"),
    "mushrooms": (32, 32, "cluster of small red capped mushrooms"),
    # clutter
    "barrel": (32, 32, "wooden barrel with iron bands"),
    "crates": (48, 48, "stack of wooden crates"),
    "hay": (48, 40, "round hay bale"),
    "lamp_post": (32, 80, "iron street lantern on a wooden post, glowing warm light"),
    "cart": (80, 64, "wooden hand cart loaded with sacks"),
    "campfire": (48, 48, "campfire with burning logs and orange flames inside a ring of grey stones"),
    "signpost": (32, 64, "wooden signpost with arrow signs"),
    "fence": (64, 32, "short horizontal wooden picket fence segment"),
    "banner": (32, 80, "tall wooden pole with a tattered crimson banner"),
    "grave_a": (32, 48, "old cracked tombstone"),
    "grave_b": (32, 48, "leaning wooden grave cross"),
    "goose": (32, 32, "white farm goose with an orange beak, looking angry"),
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
