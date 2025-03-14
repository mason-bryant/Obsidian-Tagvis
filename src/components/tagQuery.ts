
export function getQuery(
    requiredTags: string[],
    ignoreFilesWithTags: string[],
    filterTags: string[],
    limit: number,
    flattened = true
): string {

    //const requiredTagsHasNonRootTag = requiredTags.some(item => item !== "#");

    requiredTags = requiredTags.filter(item => item !== "#");

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
