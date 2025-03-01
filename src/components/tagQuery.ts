
export function getQuery(
    requiredTags: string[],
    ignoreFilesWithTags: string[],
    filterTags: string[],
    limit: number,
    flattened: boolean = true
): string {

    var fromClause = "";
    if (requiredTags.length > 0) {
        fromClause = "FROM " + requiredTags.map(tag =>
            `${tag}`)
            .join(" AND ");
    }

    var mainWhereClause = "";
    if (ignoreFilesWithTags.length > 0) {
        mainWhereClause = "WHERE " + ignoreFilesWithTags.map(tag =>
            `contains(file.tags, "${tag}") = false AND contains(file.etags, "${tag}") = false`)
            .join(" AND ");
    }

    if(flattened) {
        var secondWhereClause = "";
        if (filterTags.length > 0) {
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
        return query;
    
    } else {    
        var query = `TABLE file.name, length(rows.file.link) AS "File Count"\n\
            ${fromClause}\n\
            ${mainWhereClause}\n\
            Limit ${limit}`
        return query;
    
    }

 }
