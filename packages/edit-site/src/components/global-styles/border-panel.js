/**
 * WordPress dependencies
 */
import {
	__experimentalBorderRadiusControl as BorderRadiusControl,
	__experimentalBorderStyleControl as BorderStyleControl,
	__experimentalColorGradientSettingsDropdown as ColorGradientSettingsDropdown,
} from '@wordpress/block-editor';
import {
	__experimentalToolsPanel as ToolsPanel,
	__experimentalToolsPanelItem as ToolsPanelItem,
	__experimentalUnitControl as UnitControl,
	__experimentalUseCustomUnits as useCustomUnits,
} from '@wordpress/components';
import { useMemo } from '@wordpress/element';
import { __, _x } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { getSupportedGlobalStylesPanels, useSetting, useStyle } from './hooks';

const MIN_BORDER_WIDTH = 0;

export function useHasBorderPanel( name ) {
	const controls = [
		useHasBorderColorControl( name ),
		useHasBorderRadiusControl( name ),
		useHasBorderStyleControl( name ),
		useHasBorderWidthControl( name ),
	];

	return controls.some( Boolean );
}

function useHasBorderColorControl( name ) {
	const supports = getSupportedGlobalStylesPanels( name );
	return (
		useSetting( 'border.color', name )[ 0 ] &&
		supports.includes( 'borderColor' )
	);
}

function useHasBorderRadiusControl( name ) {
	const supports = getSupportedGlobalStylesPanels( name );
	return (
		useSetting( 'border.radius', name )[ 0 ] &&
		supports.includes( 'borderRadius' )
	);
}

function useHasBorderStyleControl( name ) {
	const supports = getSupportedGlobalStylesPanels( name );
	return (
		useSetting( 'border.style', name )[ 0 ] &&
		supports.includes( 'borderStyle' )
	);
}

function useHasBorderWidthControl( name ) {
	const supports = getSupportedGlobalStylesPanels( name );
	return (
		useSetting( 'border.width', name )[ 0 ] &&
		supports.includes( 'borderWidth' )
	);
}

function useMultiOriginColors( name ) {
	const [ customColors ] = useSetting( 'color.palette.custom', name );
	const [ themeColors ] = useSetting( 'color.palette.theme', name );
	const [ defaultColors ] = useSetting( 'color.palette.default', name );
	const [ defaultPaletteEnabled ] = useSetting(
		'color.defaultPalette',
		name
	);

	return useMemo( () => {
		const result = [];

		if ( themeColors && themeColors.length ) {
			result.push( {
				name: _x(
					'Theme',
					'Indicates this palette comes from the theme.'
				),
				colors: themeColors,
			} );
		}

		if ( defaultPaletteEnabled && defaultColors && defaultColors.length ) {
			result.push( {
				name: _x(
					'Default',
					'Indicates this palette comes from WordPress.'
				),
				colors: defaultColors,
			} );
		}

		if ( customColors && customColors.length ) {
			result.push( {
				name: _x(
					'Custom',
					'Indicates this palette comes from the theme.'
				),
				colors: customColors,
			} );
		}

		return result;
	}, [ customColors, defaultColors, defaultPaletteEnabled, themeColors ] );
}

export default function BorderPanel( { name } ) {
	// To better reflect if the user has customized a value we need to
	// ensure the style value being checked is from the `user` origin.
	const [ userBorderStyles ] = useStyle( 'border', name, 'user' );
	const createHasValueCallback = ( feature ) => () =>
		!! userBorderStyles?.[ feature ];

	const createResetCallback = ( setStyle ) => () => setStyle( undefined );

	const handleOnChange = ( setStyle ) => ( value ) => {
		setStyle( value || undefined );
	};

	const units = useCustomUnits( {
		availableUnits: useSetting( 'spacing.units' )[ 0 ] || [
			'px',
			'em',
			'rem',
		],
	} );

	// Border width.
	const showBorderWidth = useHasBorderWidthControl( name );
	const [ borderWidthValue, setBorderWidth ] = useStyle(
		'border.width',
		name
	);

	// Border style.
	const showBorderStyle = useHasBorderStyleControl( name );
	const [ borderStyle, setBorderStyle ] = useStyle( 'border.style', name );

	// When we set a border color or width ensure we have a style so the user
	// can see a visible border.
	const handleOnChangeWithStyle = ( setStyle ) => ( value ) => {
		if ( !! value && ! borderStyle ) {
			setBorderStyle( 'solid' );
		}

		setStyle( value || undefined );
	};

	// Border color.
	const showBorderColor = useHasBorderColorControl( name );
	const [ borderColor, setBorderColor ] = useStyle( 'border.color', name );
	const disableCustomColors = ! useSetting( 'color.custom' )[ 0 ];
	const disableCustomGradients = ! useSetting( 'color.customGradient' )[ 0 ];

	const borderColorSettings = [
		{
			label: __( 'Color' ),
			colors: useMultiOriginColors(),
			colorValue: borderColor,
			onColorChange: handleOnChangeWithStyle( setBorderColor ),
			clearable: false,
		},
	];

	// Border radius.
	const showBorderRadius = useHasBorderRadiusControl( name );
	const [ borderRadiusValues, setBorderRadius ] = useStyle(
		'border.radius',
		name
	);
	const hasBorderRadius = () => {
		const borderValues = userBorderStyles?.radius;
		if ( typeof borderValues === 'object' ) {
			return Object.entries( borderValues ).some( Boolean );
		}
		return !! borderValues;
	};

	const resetAll = () => {
		setBorderColor( undefined );
		setBorderRadius( undefined );
		setBorderStyle( undefined );
		setBorderWidth( undefined );
	};

	return (
		<ToolsPanel label={ __( 'Border' ) } resetAll={ resetAll }>
			{ showBorderWidth && (
				<ToolsPanelItem
					className="single-column"
					hasValue={ createHasValueCallback( 'width' ) }
					label={ __( 'Width' ) }
					onDeselect={ createResetCallback( setBorderWidth ) }
					isShownByDefault={ true }
				>
					<UnitControl
						value={ borderWidthValue }
						label={ __( 'Width' ) }
						min={ MIN_BORDER_WIDTH }
						onChange={ handleOnChangeWithStyle( setBorderWidth ) }
						units={ units }
					/>
				</ToolsPanelItem>
			) }
			{ showBorderStyle && (
				<ToolsPanelItem
					className="single-column"
					hasValue={ createHasValueCallback( 'style' ) }
					label={ __( 'Style' ) }
					onDeselect={ createResetCallback( setBorderStyle ) }
					isShownByDefault={ true }
				>
					<BorderStyleControl
						value={ borderStyle }
						onChange={ handleOnChange( setBorderStyle ) }
					/>
				</ToolsPanelItem>
			) }
			{ showBorderColor && (
				<ToolsPanelItem
					hasValue={ createHasValueCallback( 'color' ) }
					label={ __( 'Color' ) }
					onDeselect={ createResetCallback( setBorderColor ) }
					isShownByDefault={ true }
				>
					<ColorGradientSettingsDropdown
						__experimentalHasMultipleOrigins
						__experimentalIsRenderedInSidebar
						disableCustomColors={ disableCustomColors }
						disableCustomGradients={ disableCustomGradients }
						enableAlpha
						settings={ borderColorSettings }
					/>
				</ToolsPanelItem>
			) }
			{ showBorderRadius && (
				<ToolsPanelItem
					hasValue={ hasBorderRadius }
					label={ __( 'Radius' ) }
					onDeselect={ createResetCallback( setBorderRadius ) }
					isShownByDefault={ true }
				>
					<BorderRadiusControl
						values={ borderRadiusValues }
						onChange={ handleOnChange( setBorderRadius ) }
					/>
				</ToolsPanelItem>
			) }
		</ToolsPanel>
	);
}
