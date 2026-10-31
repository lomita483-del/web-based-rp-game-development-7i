# Oasis City Life – ready-to-use 3D assets

All files are CC0 (free for commercial use, no credit required).
Sources: Quaternius (Universal Base Characters, Modular Street Pack), Kenney (City Kit Suburban).

## Where each folder goes in the Lovable/GitHub project
- models/characters/player.glb          -> public/models/characters/player.glb   (male, used by PlayerAvatar3D)
- models/characters/player_female.glb   -> public/models/characters/player_female.glb
- models/world/streets/*.glb            -> public/models/world/streets/
- models/world/suburban/*.glb           -> public/models/world/suburban/

## Character notes
- Rigged humanoid (65 bones), ~1 MB each. Textures reduced to 1024px, base colour only (no normal/roughness maps) so it loads fast on mobile data.
- Mesh names: eyebrows_hair, eyes, SuperheroBase. Materials: hair, eyes, SuperheroSuit.
  The existing recolour code tints hair/eyebrows by hair colour. Eyes and the suit are left untouched.
- The free "Standard" pack only ships Superhero-suit bodies. Skin tone and outfit colour won't change until a casual outfit/body is added.
- NO animations are included in this pack. Download the free "Universal Animation Library [Standard]" (Quaternius, 45 animations,
  same rig) and load its clips onto this skeleton.

## Scale hints (starting values, tweak in game)
- Character height = about 1.8 units.
- Quaternius street tile = 2 x 2 units  -> scale about x4 so the road is ~8 units wide next to a 1.8 unit character.
- Streetlights (1.1 tall) -> scale about x4. Traffic lights (0.9 tall) -> x4. Signs (0.54 tall) -> x4.
- Kenney houses (~1.3 wide, 0.74 tall), trees (0.95 tall), fences -> scale about x6.
- Street pieces face up (+Y), centred on the origin, y from -0.1 to 0.15.
- Material colours on the street pieces are flat (no textures).

## Street pieces
Street_Straight, Street_Curve, Street_3Way(_2), Street_4Way(_2), Street_Deadend, Street_Empty, Street_Empty_Water,
Street_Elevated, Street_Elevated_Ramp, Street_Bridge(+Ramp/Underpass/Water/WaterRamp),
Streetlight_Single/Double/Triple, TrafficLight(_2), Sign_Stop/NoParking/Triangle.
