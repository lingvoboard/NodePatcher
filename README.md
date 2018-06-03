NodePatcher
==========

Node.js script for patching binary files


## Usage


```
Command line:
node nodepatcher.js patchfile.txt input.dat 

Output:
input.dat.new
replaces.log

input.dat.new - patched version

```

### The format of a patch file

```
Example:
#Persistent License Check
0xEB83	0x00	0x01
#Initial License Check
0xD538	0x38	0x08
0xD539	0x00	0x01
#Software Update Prompt
0x460B5	0x53	0xC3

Explanation:
first column - offset
second column - find
third column - replace
# - comment

The regular expression used for a validation:
/^(0[xX][0-9a-fA-F]+)[ \t]+(0[xX][0-9a-fA-F]{2})[ \t]+(0[xX][0-9a-fA-F]{2})$/

```
<hr>
