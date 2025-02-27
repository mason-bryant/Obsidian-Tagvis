import {
	App,
	Editor,
	MarkdownView,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
} from "obsidian";

import * as d3 from "d3";
import _ from "lodash"

import * as sunburst from "./components/sunburst";
import { parseConfig } from "./components/config";

// Remember to rename these classes and interfaces!

interface ObsidianD3jsSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: ObsidianD3jsSettings = {
	mySetting: "default",
};

export default class ObsidianTagVis extends Plugin {
	settings: ObsidianD3jsSettings;

	async onload() {
		await this.loadSettings();

	
		this.registerMarkdownCodeBlockProcessor('tagvis', (source, el, ctx) => {
			console.log("Starting with ", source);

			var parsedConfig = parseConfig(source);
			if (el) {
				if (parsedConfig.jsonError) {
					el.innerText = `Error parsing JSON: ${parsedConfig.jsonError}`;
				} else {
					sunburst.init(el, parsedConfig);
					console.log("end");

				}
			} else {
				console.error("Element is null");
			}
		});

		this.addSettingTab(new SampleSettingTab(this.app, this));
	}
	onunload() { }

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}



function _treemapFunction(el: HTMLElement) {
	console.log("3");
	// Get the size of the Obsidian pane
	const width = 600;
	const height = 400;
	// Get the size of the Obsidian pane

	// Sample hierarchical data with two levels
	const data = {
		name: "Root",
		children: [
			{
				name: "Group 1",
				children: [
					{ name: "A", value: 10 },
					{ name: "B", value: 20 }
				]
			},
			{
				name: "Group 2",
				children: [
					{ name: "C", value: 30 },
					{ name: "D", value: 40 },
					{ name: "E", value: 50 }
				]
			}
		]
	};

	// Create an SVG element that fills the pane
	const svg = d3.select(el)
		.append("svg")
		.attr("width", width)
		.attr("height", height)
		.style("background", "white");

	// Create a treemap layout
	const root = d3.hierarchy(data)
		.sum(d => d.value ? d.value : 0)  // Assign size only to leaf nodes
		.sort((a, b) => b.value - a.value); // Sort largest first

		

	d3.treemap()
		.size([width, height]) // Set size
		.paddingInner(4)  // Add padding inside groups
		.paddingOuter(5)  // Space around the treemap
		.round(true)(root); // Round pixel values for better rendering

	// Color scale for groups
	//const color = d3.scaleOrdinal(d3.schemeCategory10);
	const color = d3.scaleOrdinal(data.children.map(d => d.name), d3.schemeTableau10);

	// Append rectangles for each node (both parent & leaf)
	svg.selectAll("rect")
		.data(root.descendants()) // Get all levels (not just leaves)
		.enter()
		.append("rect")
		.attr("x", d => d.x0)
		.attr("y", d => d.y0)
		.attr("width", d => d.x1 - d.x0)
		.attr("height", d => d.y1 - d.y0)
		.attr("fill", d => d.depth === 1 ? color(d.data.name) : "lightgray") // Parents get colors, children are light gray
		.attr("stroke", "black");

	// Append text labels, but only if they fit inside their rectangles
	svg.selectAll("text")
		.data(root.descendants())
		.enter()
		.append("text")
		.attr("x", d => d.depth === 1 
			? d.x0 + (d.x1 - d.x0) / 2  // Center for parents
			: d.x0 + 4)                 // Left-align for children
		.attr("y", d => d.depth === 1 
			? d.y0 + (d.y1 - d.y0) / 2  // Center for parents
			: d.y0 + 14)                // Top-align for children
		.text(d => {
			const boxWidth = d.x1 - d.x0;
			const boxHeight = d.y1 - d.y0;
			const textSize = d.depth === 1 ? 14 : 12; // Larger for parents
			if (boxWidth > textSize * d.data.name.length && boxHeight > textSize + 4) {
				return d.data.name;
			}
			return ""; // Hide text if the box is too small
		})
		.attr("text-anchor", d => d.depth === 1 ? "middle" : "start") // Center parents, left-align children
    	.attr("dominant-baseline", d => d.depth === 1 ? "middle" : "hanging") // Center parents, top-align children
    	.attr("font-size", d => d.depth === 1 ? "14px" : "12px")
    	.attr("font-weight", d => d.depth === 1 ? "bold" : "normal")
    	.attr("fill", "black");

	
}


function treemapFunction(el: HTMLElement) {

	sayHello()
}
