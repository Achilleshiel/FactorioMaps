require("json")

-- consider adding symbols to beginning of mod name to ensure latest load?













local function index(entity, type)
	type = type or entity.type

	-- icon = {
	-- 	name = entity.name,
	-- 	type = type,
	-- 	path = entity.icon
	-- }


	--TODO: handle barrels..
	local path = ""
	if entity.icon ~= nil then
		path = entity.icon:sub(1, -5)
	else
		for i, icon in pairs(entity.icons) do
			if icon.tint ~= nil then
				path = path .. "|" .. icon.icon:sub(1, -5) .. "?" ..
					math.floor((icon.tint["r"] or 0)*255+0.5) .. "%" ..
					math.floor((icon.tint["g"] or 0)*255+0.5) .. "%" ..
					math.floor((icon.tint["b"] or 0)*255+0.5) .. "%" ..
					math.floor((icon.tint["a"] or 1)*255+0.5)
			else
				path = path .. "|" .. icon.icon:sub(1, -5)
			end
		end
		path = path:sub(2)
	end

	log("FactorioMaps_Output_RawTagPaths:".. type .. entity.name:sub(1,1):upper() .. entity.name:sub(2) .. ":" .. path)

	-- in 0.17, we will hopefully be able to use writefile in the data stage instead..
end


for _, signal in pairs(data.raw["virtual-signal"]) do
	index(signal, "virtual")
end

-- hopefully we dont have to hardcode this shit anymore in 0.17.. https://forums.factorio.com/viewtopic.php?f=28&t=64875
for _, type in pairs({"item", "ammo", "capsule", "gun", "item-with-entity-data", "item-with-label", "item-with-inventory", "blueprint-book", "item-with-tags", "selection-tool", "blueprint", "deconstruction-item", "module", "rail-planner", "tool", "armor", "mining-tool", "repair-tool"}) do
	for _, item in pairs(data.raw[type]) do
		index(item, "item")
	end
end

for _, fluid in pairs(data.raw["fluid"]) do
	--TODO: handle barrels..
	index(fluid)
end






data.raw["utility-sprites"].default["ammo_icon"]["filename"] = "__L0laapk3_FactorioMaps__/graphics/empty64.png"
data.raw["utility-sprites"].default["danger_icon"]["filename"] = "__L0laapk3_FactorioMaps__/graphics/empty64.png"
data.raw["utility-sprites"].default["destroyed_icon"]["filename"] = "__L0laapk3_FactorioMaps__/graphics/empty64.png"
data.raw["utility-sprites"].default["electricity_icon"]["filename"] = "__L0laapk3_FactorioMaps__/graphics/empty64.png"
data.raw["utility-sprites"].default["electricity_icon_unplugged"]["filename"] = "__L0laapk3_FactorioMaps__/graphics/empty64.png"
data.raw["utility-sprites"].default["fluid_icon"]["filename"] = "__L0laapk3_FactorioMaps__/graphics/empty64.png"
data.raw["utility-sprites"].default["fuel_icon"]["filename"] = "__L0laapk3_FactorioMaps__/graphics/empty64.png"
data.raw["utility-sprites"].default["no_building_material_icon"]["filename"] = "__L0laapk3_FactorioMaps__/graphics/empty64.png"
data.raw["utility-sprites"].default["no_storage_space_icon"]["filename"] = "__L0laapk3_FactorioMaps__/graphics/empty64.png"
data.raw["utility-sprites"].default["not_enough_construction_robots_icon"]["filename"] = "__L0laapk3_FactorioMaps__/graphics/empty64.png"
data.raw["utility-sprites"].default["not_enough_repair_packs_icon"]["filename"] = "__L0laapk3_FactorioMaps__/graphics/empty64.png"
data.raw["utility-sprites"].default["recharge_icon"]["filename"] = "__L0laapk3_FactorioMaps__/graphics/empty64.png"
data.raw["utility-sprites"].default["too_far_from_roboport_icon"]["filename"] = "__L0laapk3_FactorioMaps__/graphics/empty64.png"
data.raw["utility-sprites"].default["warning_icon"]["filename"] = "__L0laapk3_FactorioMaps__/graphics/empty64.png"
data.raw["item-request-proxy"]["item-request-proxy"].picture.filename = "__L0laapk3_FactorioMaps__/graphics/empty64.png"












