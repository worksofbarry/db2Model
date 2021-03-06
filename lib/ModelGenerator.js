const util = require('util');
const fs = require('fs');
const os = require('os');
const path = require('path');

const Table = require('./Table');
const ProcGroup = require('./ProcGroup');
var models = {};

module.exports = class ModelGenerator {
  static async getModel(schema, table) {

    var currentTable = new Table(schema, table);
    await currentTable.loadColumns();
    await currentTable.loadKeys();
    await currentTable.loadReferences();
  
    console.log(`Defined table ${currentTable.name}`);
    models[currentTable.name] = currentTable;
  
    for (var column of currentTable.columns) {
      if (column.refersTo !== null) {
        if (models[column.refersTo.table] === undefined) {
          await ModelGenerator.getModel(schema, column.refersTo.table);
        }
      }
    }
  };
  
  static async writeModels() {
    const fsWrite = util.promisify(fs.writeFile);
    const mkdir = util.promisify(fs.mkdir);
    const cpyFil = util.promisify(fs.copyFile);
  
    try {
      await mkdir('models');
    } catch (e) {}

    try {
      await cpyFil(path.join('lib', 'GenericTable.js'), path.join('models', 'GenericTable.js'));
    } catch (e) {}
  
    var filePath, lines;
    for (var model in models) {
      filePath = path.join('models', models[model].getPrettyName() + '.js');
      lines = models[model].getClass();
      await fsWrite(filePath, lines.join(os.EOL));
      console.log(`Written to "${filePath}".`);
    }

    models = {};
  }

  static async getMethods(schema) {
    const procGroup = new ProcGroup(schema);

    await procGroup.GetProcedures();
    
    models[procGroup.schema] = procGroup;
  }
}