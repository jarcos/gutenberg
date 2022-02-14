/**
 * Internal dependencies
 */
import { store as coreStore } from '../';
import { Status } from './constants';
import useQuerySelect from './use-query-select';

export default function __experimentalUseResourcePermissions( resource, id ) {
	return useQuerySelect(
		( resolve ) => {
			const { canUser } = resolve( coreStore );
			const create = canUser( 'create', resource );
			if ( ! id ) {
				return {
					status: create.status,
					isResolving: create.isResolving,
					hasResolved: create.hasResolved,
					canCreate: create.hasResolved && create.data,
				};
			}

			const update = canUser( 'update', resource, id );
			const _delete = canUser( 'delete', resource, id );
			const isResolving =
				create.isResolving || update.isResolving || _delete.isResolving;
			const hasResolved =
				create.hasResolved && update.hasResolved && _delete.hasResolved;

			let status = Status.Idle;
			if ( isResolving ) {
				status = Status.Resolving;
			} else if ( hasResolved ) {
				status = Status.Success;
			}
			return {
				status,
				isResolving,
				hasResolved,
				canCreate: hasResolved && create.data,
				canUpdate: hasResolved && update.data,
				canDelete: hasResolved && _delete.data,
			};
		},
		[ resource, id ]
	);
}
