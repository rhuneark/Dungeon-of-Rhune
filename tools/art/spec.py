"""
Art spec for Dungeon of Rhune — every generated sprite, with its prompt.

Edit a prompt, delete the matching file under tools/art/out/, and re-run
`python3 tools/art/gen.py` to regenerate just that asset; then
`python3 tools/art/pack.py` to rebuild assets/art/.

Conventions (2.5D isometric, Diablo II style)
- Ground: 2:1 isometric diamonds, 64x32 px, as 16-tile corner (Wang) sets from
  /create-tiles-pro. Characters: 64px canvases, "low top-down", 8 directions.
- Buildings and directional props (ISO_BUILDINGS / ISO_PROPS) are drawn
  isometric, seen from the south corner: the long front wall with the door
  faces lower-left (map +y, the town's "south"), the side wall lower-right.
  Their base width is about (w + h) * 32 px for a w x h tile footprint;
  pack.py measures the real footprint from the art.
- Round things (trees, rocks, barrels, lamps...) work from any angle.
- UI: item icons are 32px per inventory cell (a 2x3 armor is 64x96).
"""

PROP_STYLE = "dark fantasy medieval frontier village, muted earthy palette, pixel art, top-down rpg map object"
ICON_STYLE = "dark fantasy arpg inventory item icon, single object centered, crisp pixel art"
CHAR_STYLE = "dark fantasy rpg townsfolk, pixel art"
ISO_STYLE = (
    "isometric 2:1 pixel art building seen from the south corner, two walls visible: the long front wall with the "
    "entrance on the lower left, the short side wall on the lower right, roof seen from above, no ground tile, "
    "dark fantasy medieval frontier village, muted earthy palette"
)
ISO_PROP_STYLE = (
    "isometric 2:1 pixel art game prop seen from the south corner, front facing lower left, no ground tile, "
    "dark fantasy medieval village, muted earthy palette"
)
ISO_BUILDINGS = {"smithy", "trader", "herbalist", "lore_tower", "tavern", "house_a", "house_b", "gambler_wagon", "pit_entrance"}
# Generated with the door on the lower-right face; pack.py mirrors them so
# every front faces lower-left (map +y). Don't add art with text in it.
MIRROR = {"house_b", "smithy", "lore_tower", "gate"}
ISO_PROPS = {"gate", "market_stall", "cart", "crates", "fence", "wishing_well", "notice_board", "strongbox", "statue", "waypoint"}

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
# ------------------------------------------------------------------- tiles
# Isometric 64x32 corner sets. Describe each as "<first> to <second>": tiles
# store mask NW<<3|NE<<2|SW<<1|SE with bit 1 = the FIRST terrain. Grass comes
# first everywhere so pack.py can colour-match every set's grass to grass_dirt.
ISO_TILESETS = [
    {"name": "grass_dirt", "description": "lush dark green grass with small tufts to worn brown dirt road with small pebbles"},
    {"name": "grass_cobble", "description": "lush dark green grass with small tufts to old grey cobblestone town square pavement"},
    {"name": "grass_water", "description": "lush dark green grass with small tufts to dark murky green-blue pond water with gentle ripples"},
    {"name": "dirt_cobble", "description": "worn brown dirt road with small pebbles to old grey cobblestone town square pavement"},
]

# --------------------------------------------------------------------- props
# name -> (w, h, prompt)
PROPS = {
    # buildings / landmarks
    "smithy": (320, 288, "village blacksmith workshop, stone forge with glowing coals under a timber lean-to roof, anvil out front, brick chimney"),
    "trader": (288, 272, "merchant shop, timber frame house with a striped awning over the door and crates of goods out front, standing directly on flat ground, no base platform, no grass patch"),
    "herbalist": (288, 256, "herbalist cottage with a mossy thatched roof, bundles of drying herbs hanging by the door, standing directly on flat ground, no base platform, no fence, no grass patch"),
    "lore_tower": (192, 288, "tall narrow stone library tower with a pointed slate roof, a round window and a lantern by the door"),
    "gambler_wagon": (176, 144, "colorful fortune teller wagon with a purple canopy, hanging dice and coins, wooden wheels"),
    "tavern": (352, 320, "large two story timber tavern inn with a hanging wooden sign and warm lit windows"),
    "house_a": (224, 208, "small stone cottage with a thatched roof and a wooden door"),
    "house_b": (224, 208, "timber frame village house with a red clay tiled roof"),
    "pit_entrance": (256, 224, "ancient sealed stone archway set into a low rocky mound, stone stairs descending into darkness, heavy rusted iron chains across the opening, broken pillars carved with glowing blue runes on either side"),
    "gate": (256, 224, "wooden town gatehouse: a tall archway of two thick log posts and a crossbeam with a small roof, closed double wooden doors with iron bands"),  # generated facing lower right; mirrored
    "waypoint": (160, 112, "ring of small standing stones with glowing cyan runes around a flat carved round stone platform on the ground"),
    "wishing_well": (112, 128, "old stone wishing well with a little wooden roof and a bucket on a rope"),
    "strongbox": (64, 64, "large iron banded wooden treasure chest, closed"),
    "notice_board": (96, 112, "wooden village notice board with pinned parchment notes"),
    "statue": (80, 128, "weathered stone statue of a hooded warrior holding up a lantern, on a square pedestal"),
    "market_stall": (176, 160, "market stall with a green and white striped canopy and baskets of fruit, wooden support posts at each corner"),
    # nature
    "tree_oak": (144, 192, "large leafy oak tree"),
    "tree_pine": (96, 168, "tall dark green pine tree"),
    "tree_dead": (80, 112, "twisted dead leafless tree"),
    "bush": (48, 40, "round leafy green bush"),
    "rock_big": (48, 40, "mossy grey boulder"),
    "rocks_small": (32, 32, "cluster of small grey stones"),
    "flowers": (32, 32, "small patch of wildflowers in grass"),
    "grass_tuft": (32, 32, "tuft of tall wild grass"),
    "mushrooms": (32, 32, "cluster of small red capped mushrooms"),
    # clutter
    "barrel": (32, 32, "wooden barrel with iron bands"),
    "crates": (64, 64, "stack of wooden crates"),
    "hay": (48, 40, "round hay bale"),
    "lamp_post": (32, 80, "iron street lantern on a wooden post, glowing warm light"),
    "cart": (112, 96, "wooden hand cart loaded with sacks"),
    "campfire": (48, 48, "campfire with burning logs and orange flames inside a ring of grey stones"),
    "signpost": (32, 64, "wooden signpost with arrow signs"),
    "fence": (96, 64, "one straight segment of wooden picket fence with three posts, running diagonally from upper left to lower right, not an enclosure"),
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
