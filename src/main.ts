import {
	debounce,
	App,
	Plugin,
	PluginSettingTab,
	Setting,
} from "obsidian";

import { TagvisPluginSettings, DEFAULT_SETTINGS } from "components/settings";
import { Sunburst } from "components/sunburst";
import { parseConfig } from "components/config";
import * as logger from 'loglevel';


export default class ObsidianTagVis extends Plugin {

	public settings: TagvisPluginSettings;
	private debouncedRefresh: (text: string) => void = (text: string) => null;

	async onload() {
		await this.loadSettings();
		logger.debug("onload");

		this.registerMarkdownCodeBlockProcessor('tagvis', async (source, el, ctx) => {
			await sleep(1);
			const blockId = `block-${ctx.sourcePath}-${ctx.getSectionInfo(el)?.lineStart}`;
			const sunburst = new Sunburst();

			const parsedConfig = parseConfig(source);
			if (el) {
				if (parsedConfig.jsonError) {
					el.innerText = `Tagviz Error: Unable to parse JSON: ${parsedConfig.jsonError}`;
				} else {
					sunburst.init(this.app, el, this.settings, parsedConfig, blockId);
					if(this.settings.debugMessages) {
						logger.log("end");
					}
				}
			} else {
				logger.error("Element is null");
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
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

		if(this.settings.debugMessages) {
            logger.setLevel("DEBUG");
        } else {
            logger.setLevel("INFO");
        }
	}

	async saveSettings() {
		await this.saveData(this.settings);

		if(this.settings.debugMessages) {
            logger.setLevel("DEBUG");
        } else {
            logger.setLevel("INFO");
        }
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
			.setName('Display link preview')
			.setDesc("Turn this on to display a preview of the tagged link when it's hovered over.\
				It can sometimes get in the way of the links.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.displayLinkPreview)
				.onChange(async (value) => {
					this.plugin.settings.displayLinkPreview = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Display debug messages')
			.setDesc("Turn on of you want debug messages in the logs.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.debugMessages)
				.onChange(async (value) => {
					this.plugin.settings.debugMessages = value;
					await this.plugin.saveSettings();
				}));
	}
}
