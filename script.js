// Parse BibTeX string into an object
function parseBibTeX(bibtex) {
    const result = {};
    
    // Find type and key
    const typeMatch = bibtex.match(/@(\w+)\s*{([^,]+),/);
    if (!typeMatch) return null;
    
    result.type = typeMatch[1].toLowerCase();
    result.key = typeMatch[2].trim();
    
    // Extract fields content
    const contentStart = bibtex.indexOf(',', typeMatch[0].length) + 1;
    const contentEnd = bibtex.lastIndexOf('}');
    let content = bibtex.slice(contentStart, contentEnd);
    
    // Split fields
    const fields = [];
    let current = '';
    let braceLevel = 0;
    let inQuotes = false;
    
    for (let i = 0; i < content.length; i++) {
        const char = content[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === '{' && !inQuotes) {
            braceLevel++;
        } else if (char === '}' && !inQuotes) {
            braceLevel--;
        } else if (char === ',' && braceLevel === 0 && !inQuotes) {
            if (current.trim()) fields.push(current.trim());
            current = '';
            continue;
        }
        current += char;
    }
    if (current.trim()) fields.push(current.trim());
    
    // Parse each field
    for (let field of fields) {
        const equalIndex = field.indexOf('=');
        if (equalIndex === -1) continue;
        
        const key = field.slice(0, equalIndex).trim();
        let value = field.slice(equalIndex + 1).trim();
        
        // Clean value
        let cleanedValue = value;
        if (value.startsWith('{') && value.endsWith('}')) {
            cleanedValue = value.slice(1, -1).trim();
        } else if (value.startsWith('"') && value.endsWith('"')) {
            cleanedValue = value.slice(1, -1).trim();
        }
        
        // Remove HTML and LaTeX
        cleanedValue = cleanedValue
            .replace(/<[^\>]+>/g, '') // Remove HTML tags
            .replace(/{\\[a-zA-Z]+ (.*?)}/g, '$1') // Remove LaTeX
            .replace(/\\[a-zA-Z]+{(.)}/g, '$1') // Remove LaTeX like \"o
            .replace(/\\[a-zA-Z]+(.)\b/g, '$1') // Remove LaTeX like \'e
            .replace(/â€“/g, '–')
            .replace(/â€/g, '"')
            .replace(/â€™/g, "'")
            .replace(/[ÃÄ][a-zA-Z]/g, match => {
                const map = { 'Ã©': 'é', 'Ãè': 'è', 'Ãê': 'ê', 'Ãë': 'ë', 'Ãñ': 'ñ', 'Ãü': 'ü', 'Ãö': 'ö', 'Ãâ': 'â' };
                return map[match] || match;
            });
        
        result[key.toLowerCase()] = cleanedValue;
    }
    
    return result;
}

// Clean DOI by removing prefixes
function cleanDOI(doi) {
    return doi.replace(/^(https?:\/\/(dx\.)?doi\.org\/|doi:)/i, '').trim();
}

// Generate a GUID for XML
function generateGUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Convert BibTeX data to XML
function bibTeXToXML(data) {
    if (!data) return 'Error: Invalid BibTeX data';
    
    // Map BibTeX types to XML source types
    const typeMap = {
        'book': 'Book',
        'inbook': 'BookSection',
        'article': 'JournalArticle',
        'inproceedings': 'ConferenceProceedings',
        'techreport': 'Report',
        'misc': 'Misc',
        'website': 'InternetSite',
        'periodical': 'ArticleInAPeriodical',
        'phdthesis': 'Report'
    };
    const sourceType = typeMap[data.type] || 'Misc';
    
    // Process author
    let lastName = data.author || '';
    if (lastName.includes(' and ')) {
        lastName = lastName.split(' and ')[0].trim();
    }
    
    // Process editor
    let editorName = data.editor || '';
    if (editorName.includes(' and ')) {
        editorName = editorName.split(' and ')[0].trim();
    }
    
    // Helper to add XML tag only if value exists
    const addTagIfValue = (tagName, value, customTag = null) => {
        if (value !== undefined && value !== null && value !== '') {
            return customTag || `<${tagName}>${value}</${tagName}>`;
        }
        return '';
    };
    
    // XML templates for each source type
    const xmlTemplates = {
        Book: () => {
            const pages = (data.pages || '').replace('–', '-');
            return `<b:Source>` +
                `<b:Tag>${data.key || 'Unknown'}</b:Tag>` +
                `<b:SourceType>Book</b:SourceType>` +
                `<b:Guid>{${generateGUID().toUpperCase()}}</b:Guid>` +
                addTagIfValue('b:Title', data.title) +
                addTagIfValue('b:Year', data.year) +
                addTagIfValue('b:City', data.address) +
                addTagIfValue('b:Publisher', data.publisher) +
                addTagIfValue('b:StateProvince', data.state) +
                addTagIfValue('b:CountryRegion', data.country) +
                addTagIfValue('b:Volume', data.volume) +
                addTagIfValue('b:NumberVolumes', data.number) +
                addTagIfValue('b:ShortTitle', data.shorttitle) +
                addTagIfValue('b:StandardNumber', data.isbn || data.issn) +
                addTagIfValue('b:Pages', pages) +
                addTagIfValue('b:Edition', data.edition) +
                addTagIfValue('b:Comments', data.note) +
                addTagIfValue('b:Medium', data.medium) +
                addTagIfValue('b:YearAccessed', data.yearaccessed) +
                addTagIfValue('b:MonthAccessed', data.monthaccessed) +
                addTagIfValue('b:DayAccessed', data.dayaccessed) +
                addTagIfValue('b:DOI', data.doi) +
                `<b:Author>` +
                `<b:Author><b:NameList><b:Person><b:Last>${lastName || ''}</b:Last></b:Person></b:NameList></b:Author>` +
                `<b:Editor><b:NameList><b:Person><b:Last>${editorName || ''}</b:Last></b:Person></b:NameList></b:Editor>` +
                addTagIfValue('b:Translator', data.translator, `<b:Translator><b:NameList><b:Person><b:Last>${data.translator}</b:Last></b:Person></b:NameList></b:Translator>`) +
                `</b:Author>` +
                `</b:Source>`;
        },
        BookSection: () => {
            const pages = (data.pages || '').replace('–', '-');
            return `<b:Source>` +
                `<b:Tag>${data.key || 'Unknown'}</b:Tag>` +
                `<b:SourceType>BookSection</b:SourceType>` +
                `<b:Guid>{${generateGUID().toUpperCase()}}</b:Guid>` +
                addTagIfValue('b:Title', data.title) +
                addTagIfValue('b:Year', data.year) +
                addTagIfValue('b:City', data.address) +
                addTagIfValue('b:Publisher', data.publisher) +
                addTagIfValue('b:BookTitle', data.booktitle) +
                addTagIfValue('b:Pages', pages) +
                addTagIfValue('b:StateProvince', data.state) +
                addTagIfValue('b:CountryRegion', data.country) +
                addTagIfValue('b:Volume', data.volume) +
                addTagIfValue('b:NumberVolumes', data.number) +
                addTagIfValue('b:ChapterNumber', data.chapter) +
                addTagIfValue('b:ShortTitle', data.shorttitle) +
                addTagIfValue('b:StandardNumber', data.isbn || data.issn) +
                addTagIfValue('b:Edition', data.edition) +
                addTagIfValue('b:Comments', data.note) +
                addTagIfValue('b:Medium', data.medium) +
                addTagIfValue('b:YearAccessed', data.yearaccessed) +
                addTagIfValue('b:MonthAccessed', data.monthaccessed) +
                addTagIfValue('b:DayAccessed', data.dayaccessed) +
                addTagIfValue('b:DOI', data.doi) +
                `<b:Author>` +
                `<b:Author><b:NameList><b:Person><b:Last>${lastName || ''}</b:Last></b:Person></b:NameList></b:Author>` +
                addTagIfValue('b:BookAuthor', data.bookauthor, `<b:BookAuthor><b:NameList><b:Person><b:Last>${data.bookauthor}</b:Last></b:Person></b:NameList></b:BookAuthor>`) +
                `<b:Editor><b:NameList><b:Person><b:Last>${editorName || ''}</b:Last></b:Person></b:NameList></b:Editor>` +
                addTagIfValue('b:Translator', data.translator, `<b:Translator><b:NameList><b:Person><b:Last>${data.translator}</b:Last></b:Person></b:NameList></b:Translator>`) +
                `</b:Author>` +
                `</b:Source>`;
        },
        JournalArticle: () => {
            const pages = (data.pages || '').replace('–', '-');
            return `<b:Source>` +
                `<b:Tag>${data.key || 'Unknown'}</b:Tag>` +
                `<b:SourceType>JournalArticle</b:SourceType>` +
                `<b:Guid>{${generateGUID().toUpperCase()}}</b:Guid>` +
                addTagIfValue('b:Title', data.title) +
                addTagIfValue('b:Year', data.year) +
                addTagIfValue('b:Pages', pages) +
                addTagIfValue('b:City', data.address) +
                addTagIfValue('b:Publisher', data.publisher) +
                addTagIfValue('b:JournalName', data.journal) +
                addTagIfValue('b:Volume', data.volume) +
                addTagIfValue('b:Issue', data.number) +
                addTagIfValue('b:ShortTitle', data.shorttitle) +
                addTagIfValue('b:StandardNumber', data.issn) +
                addTagIfValue('b:Comments', data.note) +
                addTagIfValue('b:Medium', data.medium) +
                addTagIfValue('b:YearAccessed', data.yearaccessed) +
                addTagIfValue('b:MonthAccessed', data.monthaccessed) +
                addTagIfValue('b:DayAccessed', data.dayaccessed) +
                addTagIfValue('b:DOI', data.doi) +
                `<b:Author>` +
                `<b:Author><b:NameList><b:Person><b:Last>${lastName || ''}</b:Last></b:Person></b:NameList></b:Author>` +
                `<b:Editor><b:NameList><b:Person><b:Last>${editorName || ''}</b:Last></b:Person></b:NameList></b:Editor>` +
                `</b:Author>` +
                `</b:Source>`;
        },
        ArticleInAPeriodical: () => {
            const pages = (data.pages || '').replace('–', '-');
            return `<b:Source>` +
                `<b:Tag>${data.key || 'Unknown'}</b:Tag>` +
                `<b:SourceType>ArticleInAPeriodical</b:SourceType>` +
                `<b:Guid>{${generateGUID().toUpperCase()}}</b:Guid>` +
                addTagIfValue('b:Title', data.title) +
                addTagIfValue('b:Year', data.year) +
                addTagIfValue('b:Pages', pages) +
                addTagIfValue('b:PeriodicalTitle', data.journal) +
                addTagIfValue('b:City', data.address) +
                addTagIfValue('b:Publisher', data.publisher) +
                addTagIfValue('b:Edition', data.edition) +
                addTagIfValue('b:Volume', data.volume) +
                addTagIfValue('b:Issue', data.number) +
                addTagIfValue('b:ShortTitle', data.shorttitle) +
                addTagIfValue('b:StandardNumber', data.issn) +
                addTagIfValue('b:Comments', data.note) +
                addTagIfValue('b:Medium', data.medium) +
                addTagIfValue('b:YearAccessed', data.yearaccessed) +
                addTagIfValue('b:MonthAccessed', data.monthaccessed) +
                addTagIfValue('b:DayAccessed', data.dayaccessed) +
                addTagIfValue('b:DOI', data.doi) +
                `<b:Author>` +
                `<b:Author><b:NameList><b:Person><b:Last>${lastName || ''}</b:Last></b:Person></b:NameList></b:Author>` +
                `<b:Editor><b:NameList><b:Person><b:Last>${editorName || ''}</b:Last></b:Person></b:NameList></b:Editor>` +
                `</b:Author>` +
                `</b:Source>`;
        },
        ConferenceProceedings: () => {
            const pages = (data.pages || '').replace('–', '-');
            return `<b:Source>` +
                `<b:Tag>${data.key || 'Unknown'}</b:Tag>` +
                `<b:SourceType>ConferenceProceedings</b:SourceType>` +
                `<b:Guid>{${generateGUID().toUpperCase()}}</b:Guid>` +
                addTagIfValue('b:Title', data.title) +
                addTagIfValue('b:Year', data.year) +
                addTagIfValue('b:Pages', pages) +
                addTagIfValue('b:ConferenceName', data.booktitle) +
                addTagIfValue('b:City', data.address) +
                addTagIfValue('b:Publisher', data.publisher) +
                addTagIfValue('b:Volume', data.volume) +
                addTagIfValue('b:ShortTitle', data.shorttitle) +
                addTagIfValue('b:StandardNumber', data.isbn || data.issn) +
                addTagIfValue('b:Comments', data.note) +
                addTagIfValue('b:Medium', data.medium) +
                addTagIfValue('b:YearAccessed', data.yearaccessed) +
                addTagIfValue('b:MonthAccessed', data.monthaccessed) +
                addTagIfValue('b:DayAccessed', data.dayaccessed) +
                addTagIfValue('b:DOI', data.doi) +
                `<b:Author>` +
                `<b:Author><b:NameList><b:Person><b:Last>${lastName || ''}</b:Last></b:Person></b:NameList></b:Author>` +
                `<b:Editor><b:NameList><b:Person><b:Last>${editorName || ''}</b:Last></b:Person></b:NameList></b:Editor>` +
                `</b:Author>` +
                `</b:Source>`;
        },
        Report: () => {
            const pages = (data.pages || '').replace('–', '-');
            return `<b:Source>` +
                `<b:Tag>${data.key || 'Unknown'}</b:Tag>` +
                `<b:SourceType>Report</b:SourceType>` +
                `<b:Guid>{${generateGUID().toUpperCase()}}</b:Guid>` +
                addTagIfValue('b:Title', data.title) +
                addTagIfValue('b:Pages', pages) +
                addTagIfValue('b:Year', data.year) +
                addTagIfValue('b:City', data.address) +
                addTagIfValue('b:Publisher', data.publisher) +
                addTagIfValue('b:Department', data.department) +
                addTagIfValue('b:Institution', data.school || data.institution) +
                addTagIfValue('b:ThesisType', data.thesistype || 'PhD thesis') +
                addTagIfValue('b:ShortTitle', data.shorttitle) +
                addTagIfValue('b:StandardNumber', data.issn) +
                addTagIfValue('b:Comments', data.note) +
                addTagIfValue('b:Medium', data.medium) +
                addTagIfValue('b:YearAccessed', data.yearaccessed) +
                addTagIfValue('b:MonthAccessed', data.monthaccessed) +
                addTagIfValue('b:DayAccessed', data.dayaccessed) +
                addTagIfValue('b:DOI', data.doi) +
                `<b:Author>` +
                `<b:Author><b:NameList><b:Person><b:Last>${lastName || ''}</b:Last></b:Person></b:NameList></b:Author>` +
                `</b:Author>` +
                `</b:Source>`;
        },
        InternetSite: () => {
            return `<b:Source>` +
                `<b:Tag>${data.key || 'Unknown'}</b:Tag>` +
                `<b:SourceType>InternetSite</b:SourceType>` +
                `<b:Guid>{${generateGUID().toUpperCase()}}</b:Guid>` +
                addTagIfValue('b:Title', data.title) +
                addTagIfValue('b:Year', data.year) +
                addTagIfValue('b:InternetSiteTitle', data.journal || data.website) +
                addTagIfValue('b:ProductionCompany', data.publisher) +
                addTagIfValue('b:YearAccessed', data.yearaccessed) +
                addTagIfValue('b:MonthAccessed', data.monthaccessed) +
                addTagIfValue('b:DayAccessed', data.dayaccessed) +
                addTagIfValue('b:Version', data.version) +
                addTagIfValue('b:ShortTitle', data.shorttitle) +
                addTagIfValue('b:StandardNumber', data.issn) +
                addTagIfValue('b:Comments', data.note) +
                addTagIfValue('b:Medium', data.medium) +
                addTagIfValue('b:DOI', data.doi) +
                `<b:Author>` +
                `<b:Author><b:NameList><b:Person><b:Last>${lastName || ''}</b:Last></b:Person></b:NameList></b:Author>` +
                `<b:Editor><b:NameList><b:Person><b:Last>${editorName || ''}</b:Last></b:Person></b:NameList></b:Editor>` +
                addTagIfValue('b:ProducerName', data.producer, `<b:ProducerName><b:NameList><b:Person><b:Last>${data.producer}</b:Last></b:Person></b:NameList></b:ProducerName>`) +
                `</b:Author>` +
                `</b:Source>`;
        },
        Misc: () => {
            const pages = (data.pages || '').replace('–', '-');
            return `<b:Source>` +
                `<b:Tag>${data.key || 'Unknown'}</b:Tag>` +
                `<b:SourceType>Misc</b:SourceType>` +
                `<b:Guid>{${generateGUID().toUpperCase()}}</b:Guid>` +
                addTagIfValue('b:Title', data.title) +
                addTagIfValue('b:Year', data.year) +
                addTagIfValue('b:YearAccessed', data.yearaccessed) +
                addTagIfValue('b:MonthAccessed', data.monthaccessed) +
                addTagIfValue('b:DayAccessed', data.dayaccessed) +
                addTagIfValue('b:ShortTitle', data.shorttitle) +
                addTagIfValue('b:StandardNumber', data.issn || data.isbn) +
                addTagIfValue('b:Comments', data.note) +
                addTagIfValue('b:Medium', data.medium) +
                addTagIfValue('b:DOI', data.doi) +
                addTagIfValue('b:PublicationTitle', data.journal || data.booktitle) +
                addTagIfValue('b:City', data.address) +
                addTagIfValue('b:StateProvince', data.state) +
                addTagIfValue('b:CountryRegion', data.country) +
                addTagIfValue('b:Publisher', data.publisher) +
                addTagIfValue('b:Pages', pages) +
                addTagIfValue('b:Volume', data.volume) +
                addTagIfValue('b:Edition', data.edition) +
                addTagIfValue('b:Issue', data.number) +
                `<b:Author>` +
                `<b:Author><b:NameList><b:Person><b:Last>${lastName || ''}</b:Last></b:Person></b:NameList></b:Author>` +
                `<b:Editor><b:NameList><b:Person><b:Last>${editorName || ''}</b:Last></b:Person></b:NameList></b:Editor>` +
                addTagIfValue('b:Translator', data.translator, `<b:Translator><b:NameList><b:Person><b:Last>${data.translator}</b:Last></b:Person></b:NameList></b:Translator>`) +
                addTagIfValue('b:Compiler', data.compiler, `<b:Compiler><b:NameList><b:Person><b:Last>${data.compiler}</b:Last></b:Person></b:NameList></b:Compiler>`) +
                `</b:Author>` +
                `</b:Source>`;
        }
    };
    
    return xmlTemplates[sourceType] ? xmlTemplates[sourceType]() : xmlTemplates.Misc();
}

// Fetch BibTeX and output XML
async function fetchBibTeX() {
    // Get DOI from query parameter
    const urlParams = new URLSearchParams(window.location.search);
    const doi = urlParams.get('doi');
    const cleanDoi = cleanDOI(doi);
    const url = `https://doi.org/${cleanDoi}`;
    try {
        const response = await fetch(url, {
            headers: {
                'Accept': 'application/x-bibtex'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: Failed to fetch BibTeX`);
        }
        
        const bibtex = await response.text();
        
        const data = parseBibTeX(bibtex);
        console.log(data, typeOf(data));
        document.getElementById('response').textContent = JSON.stringify({ xmlString: bibTeXToXML(data) });
        
        // If this is meant to be a true API endpoint, use:
        if (window.location.search.includes('format=json')) {
            document.body.innerHTML = '';
            document.body.textContent = JSON.stringify({ xmlString: bibTeXToXML(data) });
            document.querySelector('head').innerHTML = '<meta http-equiv="Content-Type" content="application/json; charset=utf-8">';
        }
    } catch (error) {
        if (error) {
            document.getElementById('response').textContent = JSON.stringify({ error: error.message });
            
            // If this is meant to be a true API endpoint, use:
            if (window.location.search.includes('format=json')) {
                document.body.innerHTML = '';
                document.body.textContent = JSON.stringify({ error: error.message });
                document.querySelector('head').innerHTML = '<meta http-equiv="Content-Type" content="application/json; charset=utf-8">';
            }
            return;
        }
    }
}

// Run fetchBibTeX immediately
fetchBibTeX();
