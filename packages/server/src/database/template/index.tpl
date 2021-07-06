{{#imports}}
import { {{value}} } from "{{{path}}}";
{{/imports}}

@Entity({{{entityOptions}}})
export class {{entityName}} {
{{#columns}}
    @Column({{{options}}})
    {{key}}: {{type}}
{{/columns}}

{{#relations}}
    @{{decorator}}(() => {{{target}}}, {{#inverseSide}}{{{.}}},{{/inverseSide}} {{#options}}{{{.}}}{{/options}})
    {{key}}: {{type}}
{{/relations}}
}
