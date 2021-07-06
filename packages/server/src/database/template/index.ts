import {render} from 'mustache';
import * as fs from "fs";
import path from "path";
import {TemplateEntity} from "./type";

const data : TemplateEntity = {
    typeormImports: ['ManyToOne','OneToMany'],
    imports: [
        {value: 'User', path: '../User'}
    ],
    entityOptions: {tableName: "users", name: "user"},
    columns: [{
        name: 'id',
        type: 'string',
        options: `{type: "varchar", length: 100}`
    }],
    relations: []
};

(async () => {
    const file = await fs.promises.readFile(path.join(__dirname, 'index.tpl'));
    const output = render(file.toString('utf-8'), data);

    console.log(output);

})();

