class_name Rng
extends RefCounted
## Seeded RNG (mulberry32, bit-identical to the web build). Loot rolls take an
## Rng so drops are reproducible in tests / the Loot Lab, and so an item's seed
## can re-derive cosmetic choices without storing them.

const M32 := 0xFFFFFFFF

static var _uid_counter := 0
static var _world: Rng

var _s := 0


## seed < 0 -> random seed.
func _init(seed_value: int = -1) -> void:
	if seed_value < 0:
		seed_value = randi() & M32
	_s = seed_value & M32


## Shared default RNG for gameplay rolls that don't need reproducibility.
static func world() -> Rng:
	if _world == null:
		_world = Rng.new()
	return _world


## 32-bit multiply (Math.imul), done in 16-bit halves so it never overflows.
static func _imul(a: int, b: int) -> int:
	a &= M32
	b &= M32
	var lo := a * (b & 0xFFFF)
	var hi := ((a * (b >> 16)) & 0xFFFF) << 16
	return (lo + hi) & M32


## float in [0, 1)
func next_float() -> float:
	_s = (_s + 0x6D2B79F5) & M32
	var t := _s
	t = _imul(t ^ (t >> 15), t | 1)
	t = (t ^ ((t + _imul(t ^ (t >> 7), t | 61)) & M32)) & M32
	return float((t ^ (t >> 14)) & M32) / 4294967296.0


## integer in [mn, mx] inclusive
func int_range(mn: int, mx: int) -> int:
	return mn + floori(next_float() * (mx - mn + 1))


## true with probability p (0..1)
func chance(p: float) -> bool:
	return next_float() < p


func pick(arr: Array) -> Variant:
	return arr[floori(next_float() * arr.size())]


## Weighted pick; returns index, or -1 if the total weight is 0.
func weighted(weights: Array) -> int:
	var total := 0.0
	for w in weights:
		total += maxf(0.0, w)
	if total <= 0.0:
		return -1
	var r := next_float() * total
	for i in weights.size():
		r -= maxf(0.0, weights[i])
		if r < 0.0:
			return i
	return weights.size() - 1


## Short unique id for item instances.
static func uid(prefix := "i") -> String:
	_uid_counter = (_uid_counter + 1) % 1000000
	return prefix + _b36(int(Time.get_unix_time_from_system() * 1000.0)) + _b36(_uid_counter) + _b36(randi() % 1296)


static func _b36(n: int) -> String:
	const DIGITS := "0123456789abcdefghijklmnopqrstuvwxyz"
	if n <= 0:
		return "0"
	var s := ""
	while n > 0:
		s = DIGITS[n % 36] + s
		@warning_ignore("integer_division")
		n = n / 36
	return s


## JavaScript Math.round (halves round toward +infinity), for number parity.
static func jround(x: float) -> int:
	return floori(x + 0.5)
