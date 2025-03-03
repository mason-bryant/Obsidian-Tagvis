import {
	debounce,
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

import { ObsidianD3jsSettings, DEFAULT_SETTINGS } from "./components/settings";

import * as sunburst from "./components/sunburst";
import { parseConfig } from "./components/config";

//console.log("Loaded main.js from:", import.meta.url);

export default class ObsidianTagVis extends Plugin {
	public settings: ObsidianD3jsSettings;

	private debouncedRefresh: (text: string) => void = (text: string) => null;

	async onload() {
		await this.loadSettings();

		this.registerMarkdownCodeBlockProcessor('tagvis', (source, el, ctx) => {
			console.log("Starting with ", source);

			let parsedConfig = parseConfig(source);
			if (el) {
				if (parsedConfig.jsonError) {
					el.innerText = `Error parsing JSON: ${parsedConfig.jsonError}`;
				} else {
					sunburst.init(this.app, el, this.settings, parsedConfig);
					console.log("end");
				}
			} else {
				console.error("Element is null");
			}

			this.registerEvent(
				this.app.workspace.on("active-leaf-change", () => {
					console.log("active-leaf-change change");
					//sunburst.init(this.app, el, this.settings, parsedConfig);
				}
			));

			this.debouncedRefresh = debounce((text: string) => {
				console.log("refresh views... : " + text);
				sunburst.init(this.app, el, this.settings, parsedConfig);
				true
			}, 1000, true);

			console.log("Foo");

			this.debouncedRefresh("bla");
		});


		//active-leaf-change
		// Mainly intended to detect when the user switches between live preview and source mode.
		this.registerEvent(
			this.app.workspace.on("layout-change", () => {
				console.log("layout change");
			}
		));
		

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
