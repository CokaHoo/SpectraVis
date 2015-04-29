SPECTRA = (function() {

  params = {};
  var NUM_COLORS = 11;
  colorbrewer.PiYG[NUM_COLORS].reverse();
  colorbrewer.RdBu[NUM_COLORS].reverse();

  var heatmapPowerColor,
      edgeStatColor,
      NODE_RADIUS = 10,
      EDGE_WIDTH = 2,
      stopAnimation = true,
      powerColors = colorbrewer.PiYG[NUM_COLORS],
      networkColors = colorbrewer.RdBu[NUM_COLORS],
      powerLineFun, edgeStatLineFun, freqSlicePowerScale, freqSliceNetworkStatScale,
      spect1Line, spect2Line, edgeStatLine, subjects, svgCh1, svgCh2, svgEdgeStat,
      svgSpectraLegend, svgEdgeStatLegend,
      margin = {top: 40, right: 40, bottom: 40, left: 40},
      panelWidth = document.getElementById("Ch1Panel").offsetWidth - margin.left - margin.right,
      panelHeight = document.getElementById("Ch1Panel").offsetWidth*4/5 - margin.top - margin.bottom;


  svgCh1 = d3.select("#Ch1Panel")
      .append("svg")
        .attr("width", panelWidth + margin.left + margin.right)
        .attr("height", panelHeight + margin.top + margin.bottom)
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  svgCh2 = d3.select("#Ch2Panel")
      .append("svg")
        .attr("width", panelWidth + margin.left + margin.right)
        .attr("height", panelHeight + margin.top + margin.bottom)
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  svgEdgeStat = d3.select("#EdgeStatPanel")
      .append("svg")
        .attr("width", panelWidth + margin.left + margin.right)
        .attr("height", panelHeight + margin.top + margin.bottom)
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var legendWidth = document.getElementById("legendKey").offsetWidth - margin.left - margin.right,
      legendHeight = 70 - margin.top - margin.bottom;

  svgSpectraLegend = d3.selectAll("#legendKey").select("#spectraLegend")
      .append("svg")
        .attr("width", legendWidth + margin.left + margin.right)
        .attr("height", legendHeight + margin.top + margin.bottom)
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
svgEdgeStatLegend = d3.selectAll("#legendKey").select("#edgeStatLegend")
    .append("svg")
      .attr("width", legendWidth + margin.left + margin.right)
      .attr("height", legendHeight + margin.top + margin.bottom)
    .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var freqSliceWidth = document.getElementById("freqSlice").offsetWidth - margin.left - margin.right;
      freqSliceHeight =  180 - margin.top - margin.bottom;

  svgFreqSlice = d3.select("#freqSlice")
      .append("svg")
        .attr("width", freqSliceWidth + margin.left + margin.right)
        .attr("height", freqSliceHeight + margin.top + margin.bottom)
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var networkWidth,
      networkHeight,
      svgNetworkMap,
      subjectObject;

  // Load data
  var curSubject,
      curCh1 = [],
      curCh2 = [],
      curFreq_ind = 0,
      curTime_ind = 0
      mouseFlag = true,
      edgeType = "C2s_coh"
      edgeArea = "All";

  var edgeTypeDropdown = d3.select("#EdgeTypeDropdown");
  edgeTypeDropdown.selectAll("button").html(edgeType + "    <span class='caret'></span>");

  var edgeAreaDropdown = d3.select("#EdgeAreaDropdown");
  edgeAreaDropdown.selectAll("button").html(edgeArea + "    <span class='caret'></span>");

  d3.json("DATA/subjects.json", createSubjectMenu)


  // Functions
  function createSubjectMenu(isError, subjectData) {
      subjects = subjectData;
      var subjectDropdown = d3.select("#SubjectDropdown");
      var subjectMenu = subjectDropdown.selectAll(".dropdown-menu").selectAll("li").data(subjects);
      subjectMenu.enter()
        .append("li")
          .attr("id", function(d) {return d.subjectID;})
          .attr("role", "presentation")
          .html(function(d) {return "<a role='menuitem' tabindex='-1' href='#'>" + d.subjectID + "</a>";});
      curSubject = subjects[0].subjectID;
      subjectDropdown.selectAll("button").html(curSubject + "    <span class='caret'></span>");

      loadData();
  }

  // Load Files
  function loadData() {
    var channel_file = "channels_" + curSubject + ".json";

    subjectObject = subjects.filter(function(d) {return d.subjectID === curSubject;})[0];
    var aspectRatio = subjectObject.brainXpixels / subjectObject.brainYpixels;
    networkWidth = document.getElementById("NetworkPanel").offsetWidth - margin.left - margin.right;
    networkHeight =  document.getElementById("NetworkPanel").offsetWidth * (1/aspectRatio) - margin.top - margin.bottom;


    svgNetworkMap = d3.select("#NetworkPanel").selectAll("svg").data([subjectObject], function(d) {return d.subjectID;});
    svgNetworkMap.exit().remove();
    svgNetworkMap = svgNetworkMap.enter()
        .append("svg")
          .attr("width", networkWidth + margin.left + margin.right)
          .attr("height", networkHeight + margin.top + margin.bottom)
        .append("g")
          .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


    d3.json("DATA/" + channel_file, function(isError, channelData) {

        params.channel = channelData;
        if (curCh1.length === 0 || curCh2.length === 0) {
          curCh1 = params.channel[0].channelID;
          curCh2 = params.channel[1].channelID;
        }
        loadEdges();
    });
  }
  function loadEdges() {
    var edge_file = "edges_" + curSubject + "_" + edgeType + ".json";
    d3.json("DATA/" + edge_file, function(isError, edgeData) {
      params.edge = edgeData;
      loadSpectra();
    });
  }
  function loadSpectra() {
    var spectCh1_file = "spectrogram_" + curSubject + "_" + curCh1 + ".json",
        spectCh2_file = "spectrogram_" + curSubject + "_" + curCh2 + ".json",
        visInfo_file = "visInfo.json",
        edgeTypes_file = "edgeTypes.json";

    // Load the rest of the files in parallel
    queue()
        .defer(d3.json, "DATA/" + spectCh1_file)
        .defer(d3.json, "DATA/" + spectCh2_file)
        .defer(d3.json, "DATA/" + visInfo_file)
        .defer(d3.json, "DATA/" + edgeTypes_file)
        .await(display);
  }

  // Draw
  function display(isError, spect1, spect2, visInfo, edgeInfo) {

    var timeScale, timeScaleLinear, freqScale, powerScale,
        tAx, fAx, heatmapPowerColor, networkXScale, networkYScale, force, timeSlider,
        freqSlider, timeSliderText, freqSliderText, subjectDropdown, edgeStatScale,
        edgeTypeDropdown, networkColorScale, timeSliderStep, timeMaxStep_ind,
        networkXExtent, networkYExtent, edgeStat, edgeTypeName;

    tAx = visInfo.tax; // Time Axis
    fAx = visInfo.fax; // Frequency Axis
    edgeStat = params.edge.filter(function(e) {
        return e.source === curCh1 && e.target === curCh2;
    });
    edgeStat = edgeStat[0];
    edgeTypeName = edgeInfo.filter(function(e){return e.edgeTypeID === edgeType;})[0].edgeTypeName;

    setupScales();
    setupSliders();

    drawNetwork();
    drawHeatmap(svgCh1, spect1, powerScale, heatmapPowerColor);
    drawHeatmap(svgCh2, spect2, powerScale, heatmapPowerColor);
    drawHeatmap(svgEdgeStat, edgeStat, edgeStatScale, edgeStatColor);

    drawTitles();
    drawLegends();
    drawFreqSlice();
    subjectLoad();
    edgeTypeLoad();
    edgeAreaLoad();
    playButtonStart();
    resetButton();

    function setupSliders() {
      timeSlider = d3.select("#timeSlider");
      timeSliderText = d3.select("#timeSlider-value");
      freqSlider = d3.select("#freqSlider");
      freqSliderText = d3.select("#freqSlider-value");

      timeSliderStep = d3.round(tAx[1] - tAx[0], 4);
      timeMaxStep_ind = tAx.length - 1;

      timeSlider.property("min", d3.min(tAx));
      timeSlider.property("max", d3.max(tAx));
      timeSlider.property("step", timeSliderStep);
      timeSlider.property("value", tAx[curTime_ind]);
      timeSlider.on("input", updateTimeSlider);
      timeSliderText.text(tAx[curTime_ind] + " ms");

      freqSlider.property("min", d3.min(fAx));
      freqSlider.property("max", d3.max(fAx));
      freqSlider.property("step", fAx[1] - fAx[0]);
      freqSlider.property("value", fAx[curFreq_ind]);
      freqSlider.on("input", updateFreqSlider)
      freqSliderText.text(fAx[curFreq_ind] + " Hz");
    }
    function setupScales() {
      var powerMin, powerMax, powerExtent,
          edgeStatMin, edgeStatMax, edgeStatExtent;

      heatmapPowerColor = d3.scale.linear()
        .domain(d3.range(0, 1, 1.0 / (NUM_COLORS - 1)))
        .range(powerColors);
      edgeStatColor = d3.scale.linear()
        .domain(d3.range(0, 1, 1.0 / (NUM_COLORS - 1)))
        .range(networkColors);
      networkColorScale = d3.scale.ordinal()
        .domain(visInfo.brainAreas)
        .range(colorbrewer.Pastel1[7]);

      powerMin = d3.min(
        [d3.min(spect1.data, function(d) {
          return d3.min(d, function(e) {return e;});
        }),
        d3.min(spect2.data, function(d) {
          return d3.min(d, function(e) {return e;});
        })]
      );

      powerMax = d3.max(
        [d3.max(spect1.data, function(d) {
          return d3.max(d, function(e) {return e;});
        }),
        d3.max(spect2.data, function(d) {
          return d3.max(d, function(e) {return e;});
        })]
      );

      powerExtent = symmetricExtent(powerMin, powerMax);

      networkXExtent = subjectObject.brainXLim;
      networkYExtent = subjectObject.brainYLim;

      edgeStatMin = d3.min(params.edge, function(d) {
        return d3.min(d.data, function(e) {
          return d3.min(e, function(f) {return f;})
        });
      });
      edgeStatMax = d3.max(params.edge, function(d) {
        return d3.max(d.data, function(e) {
          return d3.max(e, function(f) {return f;})
        });
      });

      edgeStatExtent = symmetricExtent(edgeStatMin, edgeStatMax);

      timeScale = d3.scale.ordinal()
        .domain(tAx)
        .rangeBands([0, panelWidth]);

      timeScaleLinear = d3.scale.linear()
        .domain(d3.extent(tAx))
        .range([0, panelWidth]);

      freqScale = d3.scale.ordinal()
        .domain(fAx)
        .rangeBands([panelHeight, 0]);

      powerScale = d3.scale.linear()
        .domain(powerExtent)
        .range([0, 1])
        .nice();

      freqSlicePowerScale = d3.scale.linear()
        .domain(powerExtent)
        .range([freqSliceHeight, 0])
        .nice();

      freqSliceNetworkStatScale = d3.scale.linear()
        .domain(edgeStatExtent)
        .range([freqSliceHeight, 0])
        .nice();

      networkXScale = d3.scale.linear()
        .domain(networkXExtent)
        .range([0, networkWidth]);
      networkYScale = d3.scale.linear()
        .domain(networkYExtent)
        .range([networkHeight, 0]);
      edgeStatScale = d3.scale.linear()
        .domain(edgeStatExtent)
        .range([0, 1]);

      function symmetricExtent(min, max)  {
        if (Math.abs(min) >= Math.abs(max)) {
          max = Math.abs(min);
        } else {
          min = -1*max;
        }
        return [min, max];
      }
    }
    function drawNetwork() {
      var nodesGroup, edgesGroup, nodeG, strokeStyle, nodeClickNames = [],
          brainImage, channel, edge;

      // Replace x and y coordinates of nodes with properly scaled x,y
      channel = params.channel.map(function(n) {
        var obj = copyObject(n);
        obj.x = networkXScale(n.x);
        obj.y = networkYScale(n.y);
        return obj;
      });

      // Replace source name by source object
      edge = params.edge.map(function(e) {
            var obj = copyObject(e);
            obj.source = channel.filter(function(n) {return n.channelID === e.source;});
            obj.source = obj.source[0];
            obj.target = channel.filter(function(n) {return n.channelID === e.target;});
            obj.target = obj.target[0];
            return obj;
      });

      edge = edge.filter(edgeFilter);

      force = d3.layout.force()
        .nodes(channel)
        .links(edge)
        .charge(-200)
        .linkDistance(300)
        .size([networkWidth, networkHeight])
        .start();

      brainImageGroup = svgNetworkMap.selectAll("g#BRAIN_IMAGE").data([{}]);
      brainImageGroup.enter()
            .append("g")
              .attr("id", "BRAIN_IMAGE");
      brainImage  = brainImageGroup.selectAll("image").data([subjectObject], function(d) {return d.brainFilename;});
      brainImage.enter()
        .append("image");
      brainImage
        .attr("xlink:href", function(d){return "DATA/brainImages/" + d.brainFilename;})
        .attr("width", networkWidth)
        .attr("height", networkHeight);
      brainImage.exit()
        .remove();
      edgesGroup = svgNetworkMap.selectAll("g#EDGES").data([{}]);
      edgesGroup.enter()
            .append("g")
              .attr("id", "EDGES");
      nodesGroup = svgNetworkMap.selectAll("g#NODES").data([{}]);
      nodesGroup.enter()
        .append("g")
          .attr("id", "NODES");

      edgeLine = edgesGroup.selectAll(".edge").data(edge, function(e) {return e.source.channelID + "_" + e.target.channelID;});
      edgeLine.enter()
        .append("line")
          .attr("class", "edge")
          .style("stroke-width", EDGE_WIDTH);
      edgeLine.exit().remove();
      edgeLine
        .style("stroke", function(d) {
            return edgeStatColor(edgeStatScale(d.data[curTime_ind][curFreq_ind]));
          })
        .style("display", "")
        .on("mouseover", edgeMouseOver)
        .on("mouseout", edgeMouseOut)
        .on("click", edgeMouseClick);

      nodeG = nodesGroup.selectAll("g.gnode").data(channel, function(d) {return curSubject + "_" + d.channelID;});
      nodeG.enter()
        .append("g")
          .attr("class", "gnode")
          .attr("transform", function(d) {
              return 'translate(' + [d.x, d.y] + ')';
            })
          .on("click", nodeMouseClick);
      nodeG.exit().remove();

      nodeCircle = nodeG.selectAll("circle.node").data(function(d) {return [d];});
      nodeCircle.enter()
        .append("circle")
          .attr("class", "node")
          .attr("r", NODE_RADIUS)
          .attr("fill", "#ddd")
          .attr("opacity", 1);
      nodeCircle
          .attr("fill", function(d){
            return networkColorScale(d.region);
          });

      nodeText = nodeG.selectAll("text.nodeLabel").data(function(d) {return [d];});
      nodeText.enter()
        .append('text')
          .attr("class", "nodeLabel")
          .text(function(d) {return d.channelID;});
      // For every iteration of force simulation "tick"
      force.on("tick", function() {
        edgeLine.attr("x1", function(d) {return (d.source.x);})
            .attr("y1", function(d) {return (d.source.y);})
            .attr("x2", function(d) {return (d.target.x);})
            .attr("y2", function(d) {return(d.target.y);});

         // Translate the groups
         nodeG.attr("transform", function(d) {
             return 'translate(' + [d.x, d.y] + ')';
         });
      });
      function edgeMouseOver(e) {

         var curEdge = d3.select(this);
         strokeStyle = curEdge.style("stroke");
         curEdge
           .style("stroke-width", 2*EDGE_WIDTH)
           .style("stroke", function() {
             if (e.data[curTime_ind][curFreq_ind] < 0) {
               return edgeStatColor(0);
             } else {
               return edgeStatColor(1);
             }
           });
         var curNodes = d3.selectAll("circle.node")
          .filter(function(n) {
            return (n.channelID === e.source.channelID) || (n.channelID === e.target.channelID);
          })
          .attr("r", NODE_RADIUS * 1.2)
       }
       function edgeMouseOut(e) {
         var curEdge = d3.select(this);
         if (typeof(strokeStyle) != "undefined") {
           curEdge
             .style("stroke-width", EDGE_WIDTH)
             .style("stroke", strokeStyle);
           d3.selectAll("circle.node")
            .filter(function(n) {
              return (n.channelID === e.source.channelID) || (n.channelID === e.target.channelID);
            })
              .attr("r", NODE_RADIUS)
          }
       }
       function edgeMouseClick(e) {
         var re = /\d+/;
         curCh1 = re.exec(e.source.channelID)[0];
         curCh2 = re.exec(e.target.channelID)[0];
         mouseFlag = true;
         loadSpectra();
       }
       function nodeMouseClick(e) {
         var curNode = d3.select(this),
             node_ind = nodeClickNames.indexOf(e.channelID);

         if (node_ind > -1) {
           // If clicked on node is in the array, remove
           curNode.selectAll("circle")
             .attr("r", NODE_RADIUS);
           nodeClickNames.splice(node_ind, 1);
         } else {
           // Else add to array
           curNode.selectAll("circle")
           .attr("r", 1.2 * NODE_RADIUS);
          nodeClickNames.push(e.channelID);
         }
         if (nodeClickNames.length === 2) {
           nodeClickNames = nodeClickNames.sort();
           var re = /\d+/;
           curCh1 = re.exec(nodeClickNames[0])[0];
           curCh2 = re.exec(nodeClickNames[1])[0];
           mouseFlag = true;
           d3.selectAll("circle.node")
             .filter(function(n) {
               return (n.channelID === nodeClickNames[0]) || (n.channelID === nodeClickNames[1]);
             })
             .attr("fill", "#ddd")
             .attr("r", NODE_RADIUS);
           nodeClickNames = [];
           loadSpectra();
         }
       }
       function copyObject(obj) {
          var newObj = {};
          for (var key in obj) {
              //copy all the fields
              newObj[key] = obj[key];
          }
          return newObj;
      }
      function edgeFilter(e) {
          var isEdge;
          switch (edgeType) {
            case "C2s_coh":
              if (e.data[curTime_ind][curFreq_ind] === 0) {
                isEdge = false;
              } else {isEdge = true;}
              break;
            default:
              isEdge = true;
          }
          switch (edgeArea) {
            case "Within":
              if (e.source.region != e.target.region) {
                isEdge = false;
              } else {isEdge = isEdge & true;}
              break;
            case "Between":
              if (e.source.region === e.target.region) {
                isEdge = false;
              } else {isEdge = isEdge & true;}
              break;
            default:
              isEdge = isEdge & true;
          }

          return isEdge;
      }
    };
    function drawHeatmap(curPlot, curData, intensityScale, colorScale) {

      var heatmapG, heatmapRect, timeAxis, freqAxis, zeroG, zeroLine,
          hoverLine, hoverLineG;

      heatmapG = curPlot.selectAll("g.time").data(curData.data);
      heatmapG.enter()
        .append("g")
          .attr("transform", function(d, i) {
              return "translate(" + timeScale(tAx[i]) + ",0)";
            })
          .attr("class", "time");
      heatmapRect = heatmapG.selectAll("rect").data(function(d) {return d;});
      heatmapRect.enter()
        .append("rect")
        .attr("x", 0)
        .attr("y", function(d, i) {return freqScale(fAx[i]);})
        .attr("height", freqScale.rangeBand() )
        .attr("width", timeScale.rangeBand() )
        .style("fill", "white");
      heatmapRect
        .style("fill", function(d) {
            return colorScale(intensityScale(d));
          })
        .style("stroke", function(d) {
            return colorScale(intensityScale(d));
          });
      heatmapRect
        .on("mouseover", rectMouseOver)
        .on("click", rectMouseClick);

      timeAxis = d3.svg.axis()
                    .scale(timeScaleLinear)
                    .orient("bottom")
                    .ticks(3)
                    .tickValues([d3.min(tAx), 0, d3.max(tAx)])
                    .tickSize(0,0,0);
      freqAxis = d3.svg.axis()
                    .scale(freqScale)
                    .orient("left")
                    .tickValues(["10", "20", "40", "60", "90", "150", "200"])
                    .tickSize(0,0,0);

      timeAxisG = curPlot.selectAll("g.timeAxis").data([{}]);
      timeAxisG.enter()
          .append("g")
          .attr("class", "timeAxis")
          .attr("transform", "translate(0," + panelHeight + ")")
          .append("text")
            .attr("x", timeScaleLinear(0))
            .attr("y", 0)
            .attr("text-anchor", "middle")
            .attr("dy", 2 + "em")
            .text("Time (" + visInfo.tunits + ")");
      timeAxisG.call(timeAxis);

      freqAxisG = curPlot.selectAll("g.freqAxis").data([{}]);
      freqAxisG.enter()
        .append("g")
        .attr("class", "freqAxis")
        .append("text")
          .attr("x", -panelHeight/2)
          .attr("dy", -2 + "em")
          .attr("transform", "rotate(-90)")
          .attr("text-anchor", "middle")
          .text("Frequency (" + visInfo.funits + ")");
      freqAxisG.call(freqAxis);

      zeroG = curPlot.selectAll("g.zeroLine").data([[[0, panelHeight]]]);
      zeroG.enter()
        .append("g")
        .attr("class", "zeroLine");
      zeroLine = zeroG.selectAll("path").data(function(d) {return d;});
      zeroLine.enter()
        .append("path");
      zeroLine
        .attr("d", d3.svg.line()
              .x(timeScaleLinear(0))
              .y(function(d) { return d; })
              .interpolate("linear"))
        .attr("stroke", "black")
        .attr("stroke-width", 2)
        .attr("fill", "none")
        .style("opacity", 0.7);

      // add a 'hover' line that we'll show as a user moves their mouse (or finger)
  		// so we can use it to show detailed values of each line
  		hoverLineG = curPlot.append("g.hover-line")
  							.attr("class", "hover-line");
  		// add the line to the group
  		hoverLine = hoverLineG
  			.append("line")
  				.attr("x1", 10).attr("x2", 10) // vertical line so same value on each
  				.attr("y1", 0).attr("y2", panelHeight); // top to bottom

  		// hide it by default
  		hoverLine.classed("hide", true);
    }
    function drawTitles() {
      var titleCh1, titleCh2, titleCoh, titleSubjectEdge;
      titleCh1 = svgCh1.selectAll("text.title").data([spect1["channelID"]]);
      titleCh1.exit().remove();
      titleCh1.enter()
        .append("text")
          .attr("x", timeScaleLinear(0))
          .attr("y", 0)
          .attr("dy", -0.5 + "em")
          .attr("text-anchor", "middle")
          .attr("class", "title");
      titleCh1
          .text(function(d) {
            return "Spectra: Ch" + d;
          });
      titleCh2 = svgCh2.selectAll("text.title").data([spect2["channelID"]]);
      titleCh2.exit().remove();
      titleCh2.enter()
        .append("text")
          .attr("x", timeScaleLinear(0))
          .attr("y", 0)
          .attr("dy", -0.5 + "em")
          .attr("text-anchor", "middle")
          .attr("class", "title");
      titleCh2
          .text(function(d) {
            return "Spectra: Ch" + d;
          });
      titleCoh = svgEdgeStat.selectAll("text.title").data([edgeStat]);
      titleCoh.exit().remove();
      titleCoh.enter()
        .append("text")
          .attr("x", timeScaleLinear(0))
          .attr("y", 0)
          .attr("dy", -0.5 + "em")
          .attr("text-anchor", "middle")
          .attr("class", "title");
      titleCoh
          .text(function(d) {
            return edgeTypeName + ": Ch" + d.source + "-Ch" + d.target;
          });
    }
    function drawLegends() {
      var powerG, powerLegendRect, legendScale, colorInd, powerAxisG, powerAxis, formatter,
          edgeStatG, edgeStatLegendRect, edgeStatAxisG, edgeStatAxis, chartKeyText;

      formatter = d3.format(".2f");
      colorInd = d3.range(0, 1, 1.0 / (NUM_COLORS - 1));
      colorInd.push(1);

      chartKeyText = svgSpectraLegend.selectAll("g#ChartText").data([{}]);
      chartKeyText.enter()
        .append("text")
          .attr("id", "ChartText")
          .attr("transform", "translate(10," + 9 + ")")
          .attr("x", 0)
          .attr("y", 0)
          .attr("text-anchor", "end")
          .attr("font-size", 10 + "px")
          .attr("font-weight", "700")
          .attr("color", "#333")
          .text("Chart Key");

      legendScale = d3.scale.ordinal()
        .domain(colorInd)
        .rangeBands([0, 175]);
      // Power Legend
      powerG = svgSpectraLegend.selectAll("g#powerLegend").data([{}]);
      powerG.enter()
        .append("g")
        .attr("id", "powerLegend")
        .attr("transform", "translate(60, 0)");
      powerLegendRect = powerG.selectAll("rect.power").data(colorInd);
      powerLegendRect.enter()
        .append("rect")
          .attr("class", "power")
          .attr("x", function(d) {return legendScale(d);})
          .attr("y", 0)
          .attr("height", 10)
          .attr("width", legendScale.rangeBand());
      powerLegendRect
        .style("fill", function(d) {return heatmapPowerColor(d);});
      powerAxis = d3.svg.axis()
        .scale(legendScale)
        .orient("bottom")
        .ticks(2)
        .tickValues([colorInd[0], colorInd[colorInd.length-1]])
        .tickFormat(function (d) {
          return formatter(powerScale.invert(+d));
        })
        .tickSize(0,0,0);
      powerAxisG = powerG.selectAll("g.powerAxis").data([{}]);
      powerAxisG.enter()
        .append("g")
          .attr("transform", "translate(0," + 9 + ")")
          .attr("class", "powerAxis")
          .append("text")
            .attr("transform", "translate(" + legendScale.rangeBand()*NUM_COLORS/2 +"," + -10 + ")")
            .attr("x", 0)
            .attr("y", 0)
            .attr("text-anchor", "middle")
            .text("Power");
      powerAxisG.call(powerAxis);
      // Coh Legend
      edgeStatG = svgEdgeStatLegend.selectAll("g#edgeStatLegend").data([{}]);
      edgeStatG.enter()
        .append("g")
        .attr("id", "edgeStatLegend")
        .attr("transform", "translate(60, 0)");
      edgeStatLegendRect = edgeStatG.selectAll("rect.edgeStat").data(colorInd);
      edgeStatLegendRect.enter()
        .append("rect")
          .attr("class", "edgeStat")
          .attr("x", function(d) {return legendScale(d);})
          .attr("y", 0)
          .attr("height", 10)
          .attr("width", legendScale.rangeBand());
      edgeStatLegendRect
        .style("fill", function(d) {return edgeStatColor(d);});
      edgeStatAxis = d3.svg.axis()
        .scale(legendScale)
        .orient("bottom")
        .ticks(2)
        .tickValues([colorInd[0], colorInd[colorInd.length-1]])
        .tickFormat(function (d) {
          return formatter(edgeStatScale.invert(+d));
        })
        .tickSize(0,0,0);
      edgeStatAxisG = edgeStatG.selectAll("g.edgeStatAxis").data([{}]);
      edgeStatAxisG.enter()
        .append("g")
          .attr("transform", "translate(0," + 9 + ")")
          .attr("class", "edgeStatAxis")
        .append("text")
          .attr("transform", "translate(" + legendScale.rangeBand()*NUM_COLORS/2 +"," + -10 + ")")
          .attr("x", 0)
          .attr("y", 0)
          .attr("text-anchor", "middle")
          .text(edgeTypeName);
      edgeStatAxisG.call(edgeStatAxis);

    }
    function drawFreqSlice() {
      var freqAxis, freqG, freqSlicePowerAxis, powerG,
          edgeStatAxis, edgeStatG, freqScale, zeroG, edgeStatText;

      freqScale = d3.scale.ordinal()
          .domain(fAx)
          .rangeBands([0, freqSliceWidth]);

      powerLineFun = d3.svg.line()
          .x(function(d, i) { return freqScale(fAx[i]) + freqScale.rangeBand()/2;})
          .y(function(d) {return freqSlicePowerScale(d);});
      edgeStatLineFun = d3.svg.line()
          .x(function(d, i) { return freqScale(fAx[i]) + freqScale.rangeBand()/2;})
          .y(function(d) {return freqSliceNetworkStatScale(d);});

      freqAxis = d3.svg.axis()
          .scale(freqScale)
          .orient("bottom")
          .tickValues(["5", "20", "40", "60", "90", "150"])
          .tickSize(0,0,0);
      edgeStatAxis = d3.svg.axis()
          .scale(freqSliceNetworkStatScale)
          .orient("right")
          .ticks(2)
          .tickValues(freqSliceNetworkStatScale.domain())
          .tickSize(0,0,0);
      powerAxis = d3.svg.axis()
          .scale(freqSlicePowerScale)
          .orient("left")
          .ticks(2)
          .tickValues(freqSlicePowerScale.domain())
          .tickSize(0,0,0);

      freqG = svgFreqSlice.selectAll("g.freqSliceAxis").data([{}]);
      freqG.enter()
          .append("g")
            .attr("class", "freqSliceAxis")
            .attr("transform", "translate(0," + freqSliceHeight + ")")
          .append("text")
            .attr("x", freqSliceWidth/2)
            .attr("y", 0)
            .attr("text-anchor", "middle")
            .attr("dy", 2 + "em")
            .text("Frequency (Hz)");
       freqG.call(freqAxis);

       edgeStatG = svgFreqSlice.selectAll("g.edgeStatSliceAxis").data([{}]);
       edgeStatG.enter()
          .append("g")
            .attr("class", "edgeStatSliceAxis")
            .attr("transform", "translate(" + freqSliceWidth + ",0)");
       edgeStatText = edgeStatG.selectAll("text").data([{}]);
       edgeStatText.enter()
          .append("text")
            .attr("x", freqSliceHeight/2)
            .attr("y", 0)
            .attr("dy", -1.5 + "em")
            .attr("transform", "rotate(90)")
            .attr("text-anchor", "middle");
       edgeStatText
            .text(edgeTypeName);
       edgeStatG.call(edgeStatAxis)

       powerG = svgFreqSlice.selectAll("g.powerSliceAxis").data([{}]);
       powerG.enter()
          .append("g")
            .attr("class", "powerSliceAxis")
          .append("text")
            .attr("x", -freqSliceHeight/2)
            .attr("y", 0)
            .attr("dy", -0.5 + "em")
            .attr("transform", "rotate(-90)")
            .attr("text-anchor", "middle")
            .text("Power");
      powerG.call(powerAxis);

      zeroG = svgFreqSlice.selectAll("g.zeroLine").data([[[0, freqSliceWidth]]]);
      zeroG.enter()
          .append("g")
          .attr("class", "zeroLine");
      zeroLine = zeroG.selectAll("path").data(function(d) {return d;});
      zeroLine.enter()
          .append("path");
      zeroLine
          .attr("d", d3.svg.line()
                .x(function(d) { return d; })
                .y(freqSlicePowerScale(0))
                .interpolate("linear"))
          .attr("stroke", "black")
          .attr("stroke-width", 2)
          .attr("fill", "none")
          .style("opacity", 0.7);

      spect1Line = svgFreqSlice.selectAll("path.spect1").data([spect1.data[curTime_ind]]);
      spect1Line.enter()
        .append("path")
        .attr("class", "spect1")
        .attr("stroke", "green")
        .attr("stroke-width", 2)
        .attr("fill", "none");
      spect1Line
        .transition()
          .duration(5)
          .ease("linear")
        .attr("d", powerLineFun);
      spect2Line = svgFreqSlice.selectAll("path.spect2").data([spect2.data[curTime_ind]]);
      spect2Line.enter()
        .append("path")
        .attr("class", "spect2")
        .attr("stroke", "green")
        .attr("stroke-width", 2)
        .attr("fill", "none");
      spect2Line
        .transition()
          .duration(5)
          .ease("linear")
        .attr("d", powerLineFun);
      edgeStatLine = svgFreqSlice.selectAll("path.edgeStat").data([edgeStat.data[curTime_ind]]);
      edgeStatLine.enter()
        .append("path")
          .attr("class", "edgeStat")
          .attr("stroke", "blue")
          .attr("stroke-width", 2)
          .attr("fill", "none");
      edgeStatLine
        .transition()
          .duration(5)
          .ease("linear")
        .attr("d", edgeStatLineFun);
      timeTitle = svgFreqSlice.selectAll("text.title").data([tAx[curTime_ind]]);
      timeTitle.enter()
        .append("text")
        .attr("text-anchor", "middle")
        .attr("class", "title")
        .attr("x", freqSliceWidth/2)
        .attr("y", 0)
        .attr("dy", -1 + "em");
      timeTitle
        .text(function(d) {return "Frequency Slice @ Time " + d + " ms";});
    }
    function rectMouseOver(d, freqInd, timeInd) {
      // Mouse click can freeze visualization in place
      if (mouseFlag) {
          curFreq_ind = freqInd;
          curTime_ind = timeInd;
          drawNetwork();
          drawFreqSlice();
          updateTimeSlider.call({value: tAx[curTime_ind]});
          updateFreqSlider.call({value: fAx[curFreq_ind]});
        };
    }
    function rectMouseClick() {
      mouseFlag = !mouseFlag;
    }
    function subjectLoad() {
      subjectDropdown = d3.select("#SubjectDropdown");
      subjectDropdown.selectAll("li")
        .on("click", function() {
          subjectDropdown.selectAll("button").html(this.id + "    <span class='caret'></span>");
          curSubject = this.id;
          curCh1 = [];
          curCh2 = [];
          loadData();
          })
    }
    function edgeTypeLoad() {
      edgeTypeDropdown = d3.select("#EdgeTypeDropdown");
      edgeTypeDropdown.selectAll("li")
        .on("click", function() {
          edgeTypeDropdown.selectAll("button").html(this.id + "    <span class='caret'></span>");
          edgeType = this.id;
          loadEdges();
          })
    }
    function edgeAreaLoad() {
      edgeAreaDropdown = d3.select("#EdgeAreaDropdown");
      edgeAreaDropdown.selectAll("li")
        .on("click", function() {
          edgeAreaDropdown.selectAll("button").html(this.id + "    <span class='caret'></span>");
          edgeArea = this.id;
          drawNetwork();
          })
    }
    function playButtonStart() {
      var playButton = d3.select("#playButton");
      playButton.on("click", function(){

        d3.select("#playButton").text("Stop")
        stopAnimation = !stopAnimation;
        d3.timer(function(interval, timeSliderStep){
            if (curTime_ind < timeMaxStep_ind && stopAnimation === false) {
                curTime_ind++;
                updateTimeSlider.call({value: tAx[curTime_ind]});
            } else {
              d3.select("#playButton").text("Start")
              stopAnimation = true;
              return true;
            }
        })
      });
    }
    function resetButton() {
      var resetButton = d3.select("#resetButton");
      resetButton.on("click", function() {
          curTime_ind = 0;
          stopAnimation = true;
          updateTimeSlider.call({value: tAx[curTime_ind]});
      });

    }
    function updateTimeSlider(){
      curTime_ind = tAx.indexOf(+this.value);
      drawNetwork();
      drawFreqSlice();
      timeSlider.property("value", tAx[curTime_ind]);
      timeSliderText.text(tAx[curTime_ind] + " ms");
    }
    function updateFreqSlider(){
      curFreq_ind = fAx.indexOf(+this.value);
      drawNetwork();
      freqSlider.property("value", fAx[curFreq_ind]);
      freqSliderText.text(fAx[curFreq_ind] + " Hz");
    }
  }
})();
