
export function getQuery(
    requiredTags: string[], 
    ignoreFilesWithTags: string[], 
    filterTags: string[],
    limit: number
): string {


    
    var fromClause = "";
    if(requiredTags.length > 0) {
        fromClause = "FROM " + requiredTags.map(tag =>
             `${tag}`)
             .join(" AND ");
    }

    var mainWhereClause = "";
    if(ignoreFilesWithTags.length > 0) {
        mainWhereClause = "WHERE " + ignoreFilesWithTags.map(tag =>
             `contains(file.tags, "${tag}") = false AND contains(file.etags, "${tag}") = false`)
             .join(" AND ");
    }

    var secondWhereClause = "";
    if(filterTags.length > 0) {
        secondWhereClause = "WHERE " + filterTags.map(tag =>
             `Tag != "${tag}"`)
             .join(" AND ");
    }

    var query = `TABLE length(rows.file.link) AS "File Count"\n\
${fromClause}\n\
${mainWhereClause}\n\
FLATTEN file.tags AS Tag \n\
${secondWhereClause}\n\
GROUP BY Tag \n\
Limit ${limit}`

    console.log("query", query);
    return query;
}


/*

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


*/