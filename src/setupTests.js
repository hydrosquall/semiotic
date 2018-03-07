import React from "react"
import PropTypes from "prop-types"
import { configure } from "enzyme"
import Adapter from "enzyme-adapter-react-16"

// fix react-annotation
Object.defineProperty(React, 'PropTypes', {value: PropTypes })

configure({ adapter: new Adapter() })
