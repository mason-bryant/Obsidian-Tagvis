
export function getQuery(
    requiredTags: string[],
    ignoreFilesWithTags: string[],
    filterTags: string[],
    limit: number,
    flattened = true
): string {
    requiredTags = filterValidTags(requiredTags);
    ignoreFilesWithTags = filterValidTags(ignoreFilesWithTags);
    filterTags = filterValidTags(filterTags);

    let fromClause = "";
    if (requiredTags.length > 0) {
        fromClause = "FROM " + requiredTags.map(tag =>
            `${tag}`)
            .join(" AND ");
    }

    let mainWhereClause = "";
    if (ignoreFilesWithTags.length > 0) {
        mainWhereClause = "WHERE " + ignoreFilesWithTags.map(tag =>
            `contains(file.tags, "${tag}") = false AND contains(file.etags, "${tag}") = false`)
            .join(" AND ");
    }

    if(flattened) {
        let secondWhereClause = "";
        if (filterTags.length > 0) {
            secondWhereClause = "WHERE " + filterTags.map(tag =>
                `Tag != "${tag}"`)
                .join(" AND ");
        }

        const query = `TABLE length(rows.file.link) AS "File Count"\n\
            ${fromClause}\n\
            ${mainWhereClause}\n\
            FLATTEN file.tags AS Tag \n\
            ${secondWhereClause}\n\
            GROUP BY Tag \n\
            Limit ${limit}`
        return query;
    
    } else {    
        const query = `TABLE file.name, length(rows.file.link) AS "File Count"\n\
            ${fromClause}\n\
            ${mainWhereClause}\n\
            Limit ${limit}`
        return query;
    
    }

 }

 function filterValidTags(tags: string[]): string[] {
    // Matches strings that start with # followed by alphanumeric chars, dashes, slashes, and underscores
    const tagPattern = /^#[\w\-\/]+$/;
    return tags.filter(tag => tagPattern.test(tag));
}