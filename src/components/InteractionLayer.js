import React from "react"
import { brushX, brushY, brush } from "d3-brush"
import { extent as d3Extent } from "d3-array"
import { event } from "d3-selection"
import { voronoi } from "d3-voronoi"
import { Mark } from "semiotic-mark"

// components
import Brush from "./Brush"

import PropTypes from "prop-types"
import SpanOrDiv from "./SpanOrDiv"

class InteractionLayer extends React.Component {
  constructor(props) {
    super(props)

    this.createBrush = this.createBrush.bind(this)
    this.createColumnsBrush = this.createColumnsBrush.bind(this)
    this.brushStart = this.brushStart.bind(this)
    this.brush = this.brush.bind(this)
    this.brushEnd = this.brushEnd.bind(this)
    this.changeVoronoi = this.changeVoronoi.bind(this)
    this.doubleclickVoronoi = this.doubleclickVoronoi.bind(this)
    this.clickVoronoi = this.clickVoronoi.bind(this)
    this.calculateOverlay = this.calculateOverlay.bind(this)

    const initialOverlay = this.calculateOverlay(props)

    this.state = {
      overlayRegions: initialOverlay
    }
  }

  changeVoronoi(d, customHoverTypes) {
    //Until semiotic 2
    const dataObject = d && d.data ? { ...d.data, ...d } : d
    if (this.props.customHoverBehavior)
      this.props.customHoverBehavior(dataObject)

    if (!d) this.props.voronoiHover(null)
    else if (customHoverTypes === true) {
      const vorD = Object.assign({}, dataObject)
      vorD.type = vorD.type === "column-hover" ? "column-hover" : "frame-hover"
      this.props.voronoiHover(vorD)
    } else {
      const arrayWrappedHoverTypes = Array.isArray(customHoverTypes)
        ? customHoverTypes
        : [customHoverTypes]
      const mappedHoverTypes = arrayWrappedHoverTypes.map(c => {
        const finalC = typeof c === "function" ? c(dataObject) : c
        return Object.assign({}, dataObject, finalC)
      })
      this.props.voronoiHover(mappedHoverTypes)
    }
  }

  clickVoronoi(d) {
    //Until semiotic 2
    const dataObject = d.data ? { ...d.data, ...d } : d

    if (this.props.customClickBehavior)
      this.props.customClickBehavior(dataObject)
  }
  doubleclickVoronoi(d) {
    //Until semiotic 2
    const dataObject = d.data ? { ...d.data, ...d } : d

    if (this.props.customDoubleClickBehavior)
      this.props.customClickBehavior(dataObject)
  }

  brushStart(e, c) {
    if (this.props.interaction.start) this.props.interaction.start(e, c)
  }

  brush(e, c) {
    if (this.props.interaction.during) this.props.interaction.during(e, c)
  }

  brushEnd(e, c) {
    if (this.props.interaction.end) this.props.interaction.end(e, c)
  }

  createBrush() {
    let semioticBrush, mappingFn, selectedExtent

    const { interaction, xScale, yScale, size } = this.props

    const {
      extent = interaction.brush === "xyBrush"
        ? [
            [xScale.invert(0), yScale.invert(0)],
            [xScale.invert(size[0]), yScale.invert(size[1])]
          ]
        : interaction.brush === "xBrush"
          ? [xScale.invert(0), xScale.invert(size[0])]
          : [yScale.invert(0), yScale.invert(size[1])]
    } = interaction

    if (extent.indexOf(undefined) !== -1) {
      return <g />
    }

    if (interaction.brush === "xBrush") {
      if (extent.indexOf(undefined) !== -1) {
        return <g />
      }

      mappingFn = d => (!d ? null : [xScale.invert(d[0]), xScale.invert(d[1])])
      semioticBrush = brushX()
      selectedExtent = extent.map(d => xScale(d))
    } else if (interaction.brush === "yBrush") {
      if (extent.indexOf(undefined) !== -1) {
        return <g />
      }

      mappingFn = d => (!d ? null : [yScale.invert(d[0]), yScale.invert(d[1])])
      semioticBrush = brushY()
      selectedExtent = extent.map(d => yScale(d))
    } else {
      if (
        extent.indexOf(undefined) !== -1 ||
        extent[0].indexOf(undefined) !== -1 ||
        extent[1].indexOf(undefined) !== -1
      ) {
        return <g />
      }

      semioticBrush = brush()
      mappingFn = d =>
        !d
          ? null
          : [
              [xScale.invert(d[0][0]), yScale.invert(d[0][1])],
              [xScale.invert(d[1][0]), yScale.invert(d[1][1])]
            ]
      selectedExtent = extent.map(d => [xScale(d[0]), yScale(d[1])])
    }

    semioticBrush
      .extent([[0, 0], [this.props.size[0], this.props.size[1]]])
      .on("start", () => {
        this.brushStart(mappingFn(event.selection))
      })
      .on("brush", () => {
        this.brush(mappingFn(event.selection))
      })
      .on("end", () => {
        this.brushEnd(mappingFn(event.selection))
      })

    return (
      <g className="brush">
        <Brush
          type={interaction.brush}
          selectedExtent={selectedExtent}
          extent={extent}
          svgBrush={semioticBrush}
          size={size}
        />
      </g>
    )
  }

  componentWillReceiveProps(nextProps) {
    this.setState({ overlayRegions: this.calculateOverlay(nextProps) })
  }

  calculateOverlay(props) {
    let voronoiPaths = []
    const {
      xScale,
      yScale,
      points,
      projectedX,
      projectedY,
      projectedYMiddle,
      size,
      overlay,
      interactionOverflow = { top: 0, bottom: 0, left: 0, right: 0 }
    } = props

    if (points && props.hoverAnnotation && !overlay) {
      const voronoiDataset = []
      const voronoiUniqueHash = {}

      points.forEach(d => {
        const xValue = parseInt(xScale(d[projectedX]), 10)
        const yValue = parseInt(
          yScale(d[projectedYMiddle] || d[projectedY]),
          10
        )
        if (
          xValue >= 0 &&
          xValue <= size[0] &&
          yValue >= 0 &&
          yValue <= size[1] &&
          xValue !== undefined &&
          yValue !== undefined &&
          isNaN(xValue) === false &&
          isNaN(yValue) === false
        ) {
          const pointKey = `${xValue},${yValue}`
          if (!voronoiUniqueHash[pointKey]) {
            const voronoiPoint = Object.assign({}, d, {
              coincidentPoints: [d],
              voronoiX: xValue,
              voronoiY: yValue
            })
            voronoiDataset.push(voronoiPoint)
            voronoiUniqueHash[pointKey] = voronoiPoint
          } else voronoiUniqueHash[pointKey].coincidentPoints.push(d)
        }
      })

      const voronoiXExtent = d3Extent(voronoiDataset.map(d => d.voronoiX))
      const voronoiYExtent = d3Extent(voronoiDataset.map(d => d.voronoiY))

      const voronoiExtent = [
        [
          Math.min(voronoiXExtent[0], -interactionOverflow.left),
          Math.min(voronoiYExtent[0], -interactionOverflow.top)
        ],
        [
          Math.max(voronoiXExtent[1], size[0] + interactionOverflow.right),
          Math.max(voronoiYExtent[1], size[1] + interactionOverflow.bottom)
        ]
      ]

      const voronoiDiagram = voronoi()
        .extent(voronoiExtent)
        .x(d => d.voronoiX)
        .y(d => d.voronoiY)

      const voronoiData = voronoiDiagram.polygons(voronoiDataset)
      const voronoiLinks = voronoiDiagram.links(voronoiDataset)

      //create neighbors
      voronoiLinks.forEach(v => {
        if (!v.source.neighbors) v.source.neighbors = []

        v.source.neighbors.push(v.target)
      })

      voronoiPaths = voronoiData.map((d, i) => {
        return (
          <path
            onClick={() => {
              this.clickVoronoi(voronoiDataset[i])
            }}
            onDoubleClick={() => {
              this.doubleclickVoronoi(voronoiDataset[i])
            }}
            onMouseEnter={() => {
              this.changeVoronoi(voronoiDataset[i], props.hoverAnnotation)
            }}
            onMouseLeave={() => {
              this.changeVoronoi()
            }}
            key={`interactionVoronoi${i}`}
            d={`M${d.join("L")}Z`}
            style={{ fillOpacity: 0 }}
          />
        )
      }, this)
      return voronoiPaths
    } else if (overlay) {
      const renderedOverlay = overlay.map((overlayRegion, i) => {
        return (
          <Mark
            key={`overlay-${i}`}
            forceUpdate={true}
            {...overlayRegion}
            onClick={() => {
              this.clickVoronoi(overlayRegion.onClick())
            }}
            onDoubleClick={() => {
              this.doubleclickVoronoi(overlayRegion.onDoubleClick())
            }}
            onMouseEnter={() => {
              this.changeVoronoi(
                overlayRegion.onMouseEnter(),
                props.hoverAnnotation
              )
            }}
            onMouseLeave={() => {
              this.changeVoronoi()
            }}
          />
        )
      })

      return renderedOverlay
    }
  }

  createColumnsBrush() {
    const { projection, rScale, interaction, size, oColumns } = this.props

    let semioticBrush, mappingFn

    const max = rScale.domain()[1]

    let type = "yBrush"

    if (projection && projection === "horizontal") {
      type = "xBrush"
      mappingFn = d => (!d ? null : [rScale.invert(d[0]), rScale.invert(d[1])])
    } else
      mappingFn = d =>
        !d
          ? null
          : [
              Math.abs(rScale.invert(d[1]) - max),
              Math.abs(rScale.invert(d[0]) - max)
            ]

    const rRange = rScale.range()

    const columnHash = oColumns
    let brushPosition, selectedExtent
    const brushes = Object.keys(columnHash).map(c => {
      if (projection && projection === "horizontal") {
        selectedExtent = interaction.extent[c]
          ? interaction.extent[c].map(d => rScale(d))
          : rRange
        brushPosition = [0, columnHash[c].x]
        semioticBrush = brushX()
        semioticBrush
          .extent([[rRange[0], 0], [rRange[1], columnHash[c].width]])
          .on("start", () => {
            this.brushStart(mappingFn(event.selection), c)
          })
          .on("brush", () => {
            this.brush(mappingFn(event.selection), c)
          })
          .on("end", () => {
            this.brushEnd(mappingFn(event.selection), c)
          })
      } else {
        selectedExtent = interaction.extent[c]
          ? interaction.extent[c].map(d => rRange[1] - rScale(d)).reverse()
          : rRange
        brushPosition = [columnHash[c].x, 0]
        semioticBrush = brushY()
        semioticBrush
          .extent([[0, rRange[0]], [columnHash[c].width, rRange[1]]])
          .on("start", () => {
            this.brushStart(mappingFn(event.selection), c)
          })
          .on("brush", () => {
            this.brush(mappingFn(event.selection), c)
          })
          .on("end", () => {
            this.brushEnd(mappingFn(event.selection), c)
          })
      }

      return (
        <g key={`column-brush-${c}`} className="brush">
          <Brush
            type={type}
            position={brushPosition}
            key={`orbrush${c}`}
            selectedExtent={selectedExtent}
            svgBrush={semioticBrush}
            size={size}
          />
        </g>
      )
    })
    return brushes
  }

  render() {
    let semioticBrush = null
    const { interaction, svgSize, margin, useSpans } = this.props
    const { overlayRegions } = this.state
    let { enabled } = this.props

    if (interaction && interaction.brush) {
      enabled = true
      semioticBrush = this.createBrush()
    }
    if (interaction && interaction.columnsBrush) {
      enabled = true
      semioticBrush = this.createColumnsBrush()
    }

    if (!overlayRegions && !semioticBrush) {
      return null
    }

    return (
      <SpanOrDiv
        span={useSpans}
        className="interaction-layer"
        style={{
          position: "absolute",
          background: "none",
          pointerEvents: "none"
        }}
      >
        <svg
          height={svgSize[1]}
          width={svgSize[0]}
          style={{ background: "none", pointerEvents: "none" }}
        >
          <g
            className="interaction-overlay"
            transform={`translate(${margin.left},${margin.top})`}
            style={{ pointerEvents: enabled ? "all" : "none" }}
          >
            <g className="interaction-regions">{overlayRegions}</g>
            {semioticBrush}
          </g>
        </svg>
      </SpanOrDiv>
    )
  }
}

InteractionLayer.propTypes = {
  name: PropTypes.string,
  interaction: PropTypes.object,
  overlay: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
  oColumns: PropTypes.object,
  xScale: PropTypes.func,
  yScale: PropTypes.func,
  rScale: PropTypes.func,
  svgSize: PropTypes.array
}

export default InteractionLayer
