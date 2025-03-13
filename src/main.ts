import {
	debounce,
	App,
	Plugin,
	PluginSettingTab,
	Setting,
} from "obsidian";

import { ObsidianD3jsSettings, DEFAULT_SETTINGS } from "components/settings";
import { Sunburst } from "components/sunburst";
import { parseConfig } from "components/config";


export default class ObsidianTagVis extends Plugin {
	public settings: ObsidianD3jsSettings;
	private debouncedRefresh: (text: string) => void = (text: string) => null;

	async onload() {
		await this.loadSettings();

		console.log(`onload`);

		this.registerMarkdownCodeBlockProcessor('tagvis', async (source, el, ctx) => {
			await sleep(1);
			const blockId = `block-${ctx.sourcePath}-${ctx.getSectionInfo(el)?.lineStart}`;
			const sunburst = new Sunburst();

			const parsedConfig = parseConfig(source);
			if (el) {
				if (parsedConfig.jsonError) {
					el.innerText = `Error parsing JSON: ${parsedConfig.jsonError}`;
				} else {
					sunburst.init(this.app, el, this.settings, parsedConfig, blockId);
					console.log("end");
				}
			} else {
				console.error("Element is null");
			}

			this.debouncedRefresh = debounce((text: string) => {
				//This is a bit of a hack to let dataview update it's indexes before we proceed.
				sunburst.startQuery();
				return true;
			}, 1500, true);

			this.debouncedRefresh("hi ");
		});

		this.addSettingTab(new TagvisSettingsTab(this.app, this));
	}

	async onunload() {
		console.log(`onunload`);
	}

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
