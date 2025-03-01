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
			.setName('Display Link Preview')
			.setDesc('')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
