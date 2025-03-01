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
	displayLinkPreview: boolean;
}

const DEFAULT_SETTINGS: ObsidianD3jsSettings = {
	displayLinkPreview: true,
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

		this.addSettingTab(new TagvisSettingsTab(this.app, this));
	}
	onunload() { }

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

}

class TagvisSettingsTab extends PluginSettingTab {
	plugin: ObsidianTagVis;

	constructor(app: App, plugin: ObsidianTagVis) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Display Link Preview')
			.setDesc("Turn this on to display a preview of the tagged link when it's hovered over.\
				It can sometimes get in the way of the links.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.displayLinkPreview)
				.onChange(async (value) => {
					this.plugin.settings.displayLinkPreview = value;
					await this.plugin.saveSettings();
				}));
	}
}
