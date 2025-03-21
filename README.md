# Tag Vis

<img src="./screenshot.png" />

This is a plugin that visualizes the tags in your vault using a sunburst chart. It helps you explore the structure of your tags and their combinations, making it easy to understand how different tags relate to one another. 

It is very much a work in progress (including this README) so please stay tuned for updates.

## Installation

> [!Note]  
> This plugin requires Dataview

1. In Obsidian, open Settings.
2. Under Community plugins, select Browse.
3. Search for "tagvis" and then select it.
4. Select Install.

### Prerelease
1. Install the BRAT plugin (https://github.com/TfTHacker/obsidian42-brat) 
2. Click the Add Beta button
3. Add this repo (https://github.com/mason-bryant/Obsidian-Tagvis)

## Configuration:

Example:
~~~markdown
```tagvis
{
	"initialTag": "#ai",
	"maxDepth": 2,
	"ignoreFilesWithTags": ["#foo", "#bar"],
	"filterTags": ["#important"],
	"maxChildren": 15,
	"layout": {
		"width": 800,
		"height": 800
	}
}
```
~~~


### A single ring of files that are tagged with #work

~~~markdown

```tagvis

{
	"initialTag": "#work",
	"maxDepth": 1,
	"ignoreFilesWithTags": ["#archived"],
	"filterTags": [],
	"maxChildren": 25,
	"layout": {
	}
}

```
~~~
