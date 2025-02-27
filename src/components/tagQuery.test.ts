import { getQuery } from './tagQuery';

describe('getQuery', () => {

    it('Should produce a sane query with all the params set', () => {
        const result = getQuery(["#foo", "#bar"], 
            ["#ignore1", "#ignore2"], 
            ["#filter1", "#filter2"], 12);

        const expected = `TABLE length(rows.file.link) AS "File Count"
    FROM #foo AND #bar\n\
    WHERE contains(file.tags, "#ignore1") = false AND contains(file.etags, "#ignore1") = false AND contains(file.tags, "#ignore2") = false AND contains(file.etags, "#ignore2") = false\n\
    FLATTEN file.tags AS Tag\n\
    WHERE Tag != "#filter1") AND Tag != "#filter2")\n\
    GROUP BY Tag\n\
    Limit 12`;
    
    console.log("result", result.replace(/\s+/g, ' '));

    expect(result.replace(/\s+/g, ' ')).toBe(expected.replace(/\s+/g, ' '));
    });

    it('Should produce a sane query with no the params set', () => {
        const result = getQuery([], 
            [], 
            [], 9);

        const expected = `TABLE length(rows.file.link) AS "File Count"
    FLATTEN file.tags AS Tag\n\
    GROUP BY Tag\n\
    Limit 9`;
    
    console.log("result", result.replace(/\s+/g, ' '));

    expect(result.replace(/\s+/g, ' ')).toBe(expected.replace(/\s+/g, ' '));
    });

    /*
    it('should handle requiredTags parameter correctly', () => {
        const result = getQuery([], [], [], 10);
        expect(result).toBe("foo");
    });

    it('should handle ignoreFilesWithTags parameter correctly', () => {
        const result = getQuery([], ['ignoreTag1'], [], 10);
        expect(result).toBe("foo");
    });

    it('should handle filterTags parameter correctly', () => {
        const result = getQuery([], [], ['filterTag1'], 10);
        expect(result).toBe("foo");
    });

    it('should handle all parameters correctly', () => {
        const result = getQuery(['tag1'], ['ignoreTag1'], ['filterTag1'], 10);
        expect(result).toBe("foo");
    }); 
    */

});
