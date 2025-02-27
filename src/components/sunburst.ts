import * as d3 from "d3";
import { Plugin } from "obsidian";
import { parseConfig, StarburstConfig } from "./config";


var emptyData = {
    "name": "",
    "children": [
        {
            "name": "#",
            "value": 1,
            "children": [
             ]
         }
    ]
};

interface DataNode {
    name: string;
    value?: number;
    children: DataNode[];
}

var m_config : StarburstConfig;
var firstRun = true;
var data : DataNode;

//eg: AND contains(file.tags, "#zettel") = false AND contains(file.etags, "#zettel") = false
var ignoreFilesWithTags = "";

export function init(el, config) {
    firstRun = true;
    m_config = config;
    data = structuredClone(emptyData);

    if(m_config.ignoreFilesWithTags.length > 0) {
        ignoreFilesWithTags = m_config.ignoreFilesWithTags.map(tag =>
             `contains(file.tags, "${tag}") = false AND contains(file.etags, "${tag}") = false`)
             .join(" AND ");
        console.log("filteredTags", ignoreFilesWithTags);
        ignoreFilesWithTags = " AND " + ignoreFilesWithTags;
    }

    d3.select(el).selectAll("*").remove();
    render(el);
}

export function render(el) {

    console.log("render called");

    if (!el) {
        console.error("Invalid DOM element");
        return;
    }

    if((m_config.layout.width > el.clientWidth) && (el.clientWidth > 0)) {
        m_config.layout.width = el.clientWidth;
        console.log("width adjusted to", m_config.layout.width);
    }

    const color = d3.scaleOrdinal(d3.quantize(d3.interpolateRainbow, data.children.length + 1));
    const radius = Math.min(m_config.layout.width, m_config.layout.height) / 2 - 20;

    // Prepare the layout.
    const partition = data => d3.partition()
        .size([2 * Math.PI, radius])
        (d3.hierarchy(data)
            .sum(d => d.value)
            .sort((a, b) => b.value - a.value));

    const arc = d3.arc()
        .startAngle(d => d.x0)
        .endAngle(d => d.x1)
        .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
        .padRadius(radius / 2)
        .innerRadius(d => d.y0)
        .outerRadius(d => d.y1 - 1);

    const root = partition(data);
  
    // Create the SVG container.
    const svg = d3.select(el)
        .append("svg")
        .attr("id", "findme")
        .attr("width", m_config.layout.width)
        .attr("height", m_config.layout.height)
        .attr("viewBox", `0 0 ${m_config.layout.width} ${m_config.layout.height}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .style("background", "white");

    // Add an arc for each element, with a title for tooltips.
    const format = d3.format(",d");
    const g = svg.append("g")
        .attr("transform", `translate(${m_config.layout.width / 2}, ${m_config.layout.height / 2})`)
        .attr("fill-opacity", 0.6);

    const paths = g.selectAll("path")
        .data(root.descendants().filter(d => d.depth))
        .join("path")
        .attr("fill", d => { while (d.depth > 1) d = d.parent; return color(d.data.name); })
        .attr("d", arc)
        .on("click", function(event, d) {
            console.log("Clicked path:", d.data.name);
            onNodeClick(data, d.data.name); // Add a child to the source data
        })
        .on("mouseover", function(event, d) {
            // TODO: add a div below with all the files that include the 
            //    tag and it's history
            //    eg> d.data.name + d.data.tagHistory
            console.log("Hovered over node:", d.data.name);
        })
        .append("title")
        .text(d => `${d.ancestors().map(d => d.data.name).reverse().join("/")}\n${format(d.value)}`);

    // Add a label for each element.
    g.selectAll("text")
        .data(root.descendants().filter(d => d.depth && (d.y0 + d.y1) / 2 * (d.x1 - d.x0) > 10))
        .join("text")
        .attr("transform", function (d) {
            const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
            const y = (d.y0 + d.y1) / 2;
            return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
        })
        .attr("dy", "0.35em")
        .attr("text-anchor", "middle")
        .attr("font-size", m_config.fontsize)
        .attr("font-family", "sans-serif")
        .on("click", function(event, d) {
            console.log("Clicked text:", d.data.name);
            onNodeClick(data, d.data.name); // Add a child to the source data
        })
        .on("mouseover", function(event, d) {
            console.log("Hovered over text:", d.data.name);
        })
        .text(d => d.data.name);

    g.append("circle")
        .attr("r", radius / 5)
        .attr("fill", "white")
        .attr("stroke", "black")
        .attr("stroke-width", 1);

    g.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .attr("font-size", m_config.fontsize)
        .attr("font-family", "sans-serif")
        .text(root.data.name);

    if(firstRun) {
        firstRun = false;
        start(m_config.initialTag);
        console.log("First run, done");
    }
     
    console.log("end....");
    
    function sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function onNodeClick(data: DataNode, name: string) {
        console.log("nodeClick with tag " + name);
        start(name)
    }

    function start(initialTag: string) {

        if(initialTag === null || initialTag === "") {
            executeQuery("", data, [], 0)
        } else {
            data.name = initialTag;
            executeQuery(initialTag, data, ["" + initialTag], 1)
        }
    }

    async function executeQuery(
        tag: string, 
        data: DataNode, 
        tagHistory: string[], 
        initialDepth: number) {

        var depth = tagHistory.length + 1 - initialDepth;

        if(depth > m_config.maxDepth) {
            console.log("at depth")
            return;
        }
        d3.select(el).selectAll("*").remove(); // Clear the existing visualization
        render(el);
        await sleep(10);

        await runQuery(tag, tagHistory).then(result => {
           if(!result.successful) {
                console.log("query failed");
                return;              
            } 

            data.children = [];
            result.value.values.forEach( item =>{
                var tag = item[0];
                var child = {
                    name: tag,
                    tagHistory: tagHistory,
                    value: item[1],
                    children: []
                };
                data.children.push(child);

                var newTagHistory = tagHistory.slice();
                newTagHistory.push(tag);
                if(depth < m_config.maxDepth) {
                    executeQuery(tag, child, newTagHistory, initialDepth);
                }

            });
            d3.select(el).selectAll("*").remove(); // Clear the existing visualization
            render(el); // Re-render the chart with the updated data
        });
    }

    async function runQuery(tag, tagHistory ) {
        console.log("query for tag", tag);
        
        const maxResults = 10;

        var query;
        if(tag === null || tag === "") {
            query = `TABLE length(rows.file.link) AS "File Count" \n\
                WHERE true ${ignoreFilesWithTags} \n\
                FLATTEN file.tags AS Tag \n\
                GROUP BY lower(Tag) \n
                SORT length(rows.file.link) DESC \n
                Limit ${m_config.maxChildren}`;
        } else {
            tag = tag.replace(/^#/, "");
            tag = tag.toLowerCase();

            const tagsToFind = tagHistory.map(t => `${t}`).join(" AND ");
            const tagsToExclude = tagHistory.map(t => `lower(Tag) != "${t}"`).join("AND ");

            query = `TABLE length(rows.file.link) AS "File Count" \n\
                FROM ${tagsToFind} \n\
                WHERE true ${ignoreFilesWithTags} \n\
                FLATTEN file.tags AS Tag  \n\
                WHERE ${tagsToExclude} \n\
                GROUP BY lower(Tag)  \n\
                SORT length(rows.file.link) DESC \n\
                Limit ${m_config.maxChildren}`;
        }

        console.log("Running Query:", query);


        const dv = app.plugins.plugins["dataview"]?.api;
        if (!dv) {
            console.error("Dataview plugin is not enabled.");
            return;
        }
        
        try {
            const result = await dv.query(query);  // Waits here until the query finishes
            console.log("Dataview Query Result:", result);
            return result;  // This will return the data once ready
        } catch (error) {
            console.error("Dataview Query Error:", error);
        }
    }

}

