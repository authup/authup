import {TemplateEntity, TransformedTemplateData} from "./type";

export function transformTemplateData(rawData: TemplateEntity) : TransformedTemplateData {
    const imports : TransformedTemplateData['imports'] = rawData.imports
        .map(config => {
            const items = Array.isArray(config.value) ? config.value : [config.value];

            return {
                path: config.path,
                value: items.join(", ")
            };
        });

    const entityOptions : TransformedTemplateData['entityOptions'] = JSON.stringify(rawData.entityOptions);


    const data : TransformedTemplateData = {
        imports,
        entityOptions,
        entity
    };

    return data;
}
