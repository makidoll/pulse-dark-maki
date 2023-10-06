import * as jsonc from "https://deno.land/std@0.203.0/jsonc/mod.ts";

async function exists(path: string) {
	try {
		await Deno.stat(path);
		return true;
	} catch (error) {
		return false;
	}
}

const copyExists = await exists("manifest.original.json");
const original = await Deno.readTextFile(
	copyExists ? "manifest.original.json" : "manifest.json",
);
if (!copyExists) await Deno.writeTextFile("manifest.original.json", original);

const manifest = jsonc.parse(original);

const colorStr = new Array(6).fill(" ").join("");

function parseColorStr(colorStr: string) {
	colorStr = colorStr.replaceAll(" ", "");

	if (colorStr == "transparent") return { r: 0, g: 0, b: 0, a: 0 };

	const rgbaMatches = colorStr.match(
		/rgba?\(([0-9]+),([0-9]+),([0-9]+)(?:,([0-9]+(?:\.[0-9]+)))?\)/i,
	);

	if (rgbaMatches != null) {
		return {
			r: parseInt(rgbaMatches[1]),
			g: parseInt(rgbaMatches[2]),
			b: parseInt(rgbaMatches[3]),
			a: rgbaMatches[4] == null ? 1 : parseFloat(rgbaMatches[4]),
		};
	}

	const hexMatches = colorStr.match(
		/#([0-f]{2})([0-f]{2})([0-f]{2})([0-f]{2})?/,
	);

	if (hexMatches != null) {
		return {
			r: parseInt(hexMatches[1], 16),
			g: parseInt(hexMatches[2], 16),
			b: parseInt(hexMatches[3], 16),
			a: hexMatches[4] == null ? 1 : parseInt(hexMatches[4], 16) / 255,
		};
	}

	throw Error("Unknown color: " + colorStr);
}

const material: { [key: string]: { [key: string]: string } } = {
	pink: {
		"100": "#F8BBD0",
		"200": "#F48FB1",
		"300": "#F06292",
		"400": "#EC407A",
		"500": "#E91E63",
		"600": "#D81B60",
		"700": "#C2185B",
		"800": "#AD1457",
		"900": "#880E4F",
	},
	purple: {
		"100": "#E1BEE7",
		"200": "#CE93D8",
		"300": "#BA68C8",
		"400": "#AB47BC",
		"500": "#9C27B0",
		"600": "#8E24AA",
		"700": "#7B1FA2",
		"800": "#6A1B9A",
		"900": "#4A148C",
	},
};

const manualOverrideColorOnlyMap: { [key: string]: string } = {
	button_primary: material.pink[500],
	button_primary_hover: material.pink[300],
	button_primary_active: material.pink[500],
	error_text_color: "dontchange",
	input_border_error: "dontchange",
	appmenu_update_icon_color: "dontchange",
	appmenu_info_icon_color: "dontchange",
};

function lerp(a: number, b: number, alpha: number) {
	return a + alpha * (b - a);
}

for (const [key, oldColorStr] of Object.entries(manifest.theme.colors)) {
	let color = parseColorStr(oldColorStr as string);

	let changed = false;

	// pulse_ doesnt even do anything

	// if (key.startsWith("pulse_grey_")) {
	// 	const avg = (color.r + color.g + color.b) / 3;
	// 	color.r = color.g = color.b = Math.round(avg);
	// 	changed = true;
	// }

	if (key.startsWith("pulse_primary_")) {
		const weight = key.replace("pulse_primary_", "");
		color = parseColorStr(material.pink[weight]);
		changed = true;
	}

	if (key.startsWith("pulse_secondary_")) {
		const weight = key.replace("pulse_secondary_", "");
		color = parseColorStr(material.purple[weight]);
		changed = true;
	}

	// gray scale anything that isnt color

	if (!changed) {
		const manualOverrideColor = manualOverrideColorOnlyMap[key];
		if (manualOverrideColor == null) {
			let avg = (color.r + color.g + color.b) / 3;

			// if dark make darker
			if (avg < 64) {
				avg -= lerp(avg, 0, 0.7);
			}

			color.r = color.g = color.b = Math.round(avg);
			changed = true;
		} else if (manualOverrideColor != "dontchange") {
			color = parseColorStr(manualOverrideColor);
			changed = true;
		}
	}

	// okay propogate

	const newColorStr = changed
		? color.a == 1
			? `rgb(${color.r},${color.g},${color.b})`
			: `rgba(${color.r},${color.g},${color.b},${color.a})`
		: oldColorStr;

	if (changed) {
		manifest.theme.colors[key] = newColorStr;
	}

	console.log(
		`%c${colorStr}%c ${changed ? "->" : "  "} %c${colorStr}%c ${key}`,
		`background-color: ${oldColorStr};`,
		"",
		`background-color: ${newColorStr};`,
		"",
	);
}

// update some manifest strings

manifest.applications.gecko.id = "pulse-dark-maki@makidrone.io";
manifest.name = "Pulse Dark Maki";
manifest.description = "Pulse Dark modified by Maki";
manifest.author = "Maki";

await Deno.writeTextFile("manifest.json", JSON.stringify(manifest, null, 4));
