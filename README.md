# Obsidian Tag Vis

<img src="./screenshot.png" />

This is a plugin for visualization the tags in your vault as a hierarchy.  

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