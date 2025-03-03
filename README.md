# Obsidian Tag Vis

<img src="./screenshot.png" />

This is a plugin that visualizes the tags in your vault using a sunburst chart. It helps you explore the structure of your tags and their combinations, making it easy to understand how different tags relate to one another. 

It is very much a work in progress (including this README) so please stay tuned for updates.


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


## Required Plugins
* Dataview!