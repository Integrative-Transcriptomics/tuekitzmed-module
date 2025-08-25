# Interactive Module Book for the Platform TüKITZMed

This HTML-based module book is automatically deployed under https://integrative-transcriptomics.github.io/tuekitzmed-module/

The module is divided in three different blocks:

- Classes: Different learn paths for different courses. 
- Modules: Every module consists of multiple units and is categorized into one of the three major topics: Machine Learning, Mathematics and Applications. Moreover, each module can be allocated into one or many classes. See below for more infomraiton. Consider that the three major topics cannot be adapted from the CSV files but only from the HTML programming. 
- Units: Also named "learning nuggets". It might correspond to one single video of the platform. 

## Updating the module

To update the website, please change the three CSV files found in this repo and commit the changes. After commiting in the main branch, the deployment would automatically start. 

### classes.csv

Each class is defined by the following fields:
- ClassID: needed for allocation of modules
- ClassName: CSS ID for this class
- ButtonText: used for the text in the corresponding button:
- Color: Color of the button, in RGB

### modules.csv

Each module is defined as follows:

- ModuleID: Used for the allocation of units
- ModuleName: Text name for the module
- ModuleDescription: A short overview of what the module will handle. Appears in a small box, when the module is clicked.
- Category: One of the three major topics (Machine Learning, Mathematics, Applications)
- MajorClassIDs: Classes (from classes.csv) where this module should be allocated too. The ClassIDs should be concatenated using a '+'.
- Difficulty: One of Basic, Advanced, Expert


### units.csv

Should be defined by:

- UnitID: An ID for the unit only used in HTML. 
- UnitName: The title of the unit.
- ModuleID: In which module (from modules.csv) this unit should be allocated to. 
- UnitDescription: A short description of what the goal of the nugget unit is. 


